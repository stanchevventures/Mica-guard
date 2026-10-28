// =====================================================================
// Регистър на ESMA по MiCA (временен регистър, CSV файлове)
//
// ESMA публикува регистъра като CSV файлове, докато не го интегрира в
// своите ИТ системи. Този модул:
//   1) сваля и разчита файловете (без външни библиотеки);
//   2) ги заменя в базата атомарно — по един регистър наведнъж;
//   3) събира записите за дадено LEI в една обобщена картина за двигателя.
//
// Файлът няма импорти по време на изпълнение, за да може да се ползва
// и от Next.js, и от скрипта scripts/esma-sync.mts (node --experimental-strip-types).
// =====================================================================

import type { CaspService, IssuerAuthorisation } from "../mica/engine";

const BASE = "https://www.esma.europa.eu/sites/default/files/2024-12";

/** Файловете на временния регистър (провери ги на страницата на ESMA за MiCA, ако ESMA ги премести) */
export const ESMA_REGISTER_FILES = {
  casp: `${BASE}/CASPS.csv`, // доставчици с лиценз (чл. 63) или нотификация (чл. 60)
  emt: `${BASE}/EMTWP.csv`, //  емитенти на EMT и техните бели книги
  art: `${BASE}/ARTZZ.csv`, //  емитенти на ART и техните бели книги
  ncasp: `${BASE}/NCASP.csv`, // субекти, предоставящи услуги без лиценз (списък с предупреждения)
} as const;

export type RegisterKind = keyof typeof ESMA_REGISTER_FILES;

/**
 * Резервен източник, само при изрично поискване (--mirror): непроменени копия на същите
 * CSV файлове, които CASP Tracker сваля от ESMA (github.com/CASP-Tracker/mica-register-data).
 * Използва се, ако сайтът на ESMA е недостъпен; източникът се записва в базата.
 */
const MIRROR = "https://raw.githubusercontent.com/CASP-Tracker/mica-register-data/main/source";
export const ESMA_REGISTER_MIRROR: Record<RegisterKind, string> = {
  casp: `${MIRROR}/CASPS.csv`,
  emt: `${MIRROR}/EMTWP.csv`,
  art: `${MIRROR}/ARTZZ.csv`,
  ncasp: `${MIRROR}/NCASP.csv`,
};
export const REGISTER_KINDS = Object.keys(ESMA_REGISTER_FILES) as RegisterKind[];

/** Колони, без които файлът се счита за променен формат и не се импортира */
const REQUIRED_HEADERS: Record<RegisterKind, string[]> = {
  casp: ["ae_competentAuthority", "ae_homeMemberState", "ae_lei_name", "ae_lei", "ac_authorisationNotificationDate", "ac_serviceCode"],
  emt: ["ae_competentAuthority", "ae_lei_name", "ae_lei", "ae_authorisation_other_emt", "wp_url", "wp_authorisationNotificationDate"],
  art: ["ae_competentAuthority", "ae_lei_name", "ae_lei", "wp_url", "wp_authorisationNotificationDate"],
  ncasp: ["ae_competentAuthority", "ae_homeMemberState", "ae_lei_name", "ae_website"],
};

/** Защита от непълно сваляне или сменен формат: нов файл с под 50% от досегашните редове се отхвърля */
const MIN_ROW_RATIO = 0.5;

// ---------------------------------------------------------------------
// CSV (RFC 4180): кавички, запетаи и нови редове в полета, BOM, CRLF
// ---------------------------------------------------------------------
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

export function toRecords(text: string): { headers: string[]; records: Record<string, string>[] } {
  const [head, ...body] = parseCsv(text);
  if (!head) return { headers: [], records: [] };
  const headers = head.map((h) => h.trim());
  const records = body.map((r) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      const v = (r[i] ?? "").trim();
      if (h !== "" && v !== "") rec[h] = v;
    });
    return rec;
  });
  return { headers, records };
}

// ---------------------------------------------------------------------
// Нормализиране на стойностите
// ---------------------------------------------------------------------
const LEI_RE = /^[A-Z0-9]{18}[0-9]{2}$/;

export function normalizeLei(v: string | null | undefined): string | null {
  const s = (v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return LEI_RE.test(s) ? s : null;
}

/** Контролните цифри на LEI (ISO 17442, ISO 7064 MOD 97-10): остатъкът трябва да е 1 */
export function isValidLei(v: string): boolean {
  if (!LEI_RE.test(v)) return false;
  let rem = 0;
  for (const ch of v) {
    const digits = /[0-9]/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of digits) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1;
}

/**
 * В регистъра има LEI с грешка при въвеждане (невалидни контролни цифри).
 * Ако точно едно такова LEI се различава от търсеното с един знак или две разменени
 * съседни позиции, приемаме, че е същото лице.
 */
export function findMistypedLei(lei: string, candidates: string[]): string | null {
  const near = (a: string, b: string) => {
    if (a.length !== b.length) return false;
    const diff: number[] = [];
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push(i);
    if (diff.length === 1) return true;
    return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
  };
  const hits = [...new Set(candidates)].filter((c) => c !== lei && !isValidLei(c) && near(lei, c));
  return hits.length === 1 ? hits[0] : null;
}

/** "09/04/2025" -> "2025-04-09"; невалидни дати -> null */
export function parseEsmaDate(v: string | null | undefined): string | null {
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec((v ?? "").trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Буквите а)–й) от чл. 3(1), т. 16 в реда на регламента */
const LETTER_SERVICE: Record<string, CaspService> = {
  a: "custody",
  b: "trading_platform",
  c: "exchange_funds",
  d: "exchange_crypto",
  e: "execution",
  f: "placing",
  g: "rto",
  h: "advice",
  i: "portfolio",
  j: "transfer",
};

/**
 * Услугите в регистъра са текст, разделен с „|“, понякога с „;“, табулации или без буква.
 * Разпознаваме по съдържанието, а буквата е резервен вариант.
 */
export function parseServices(v: string | null | undefined): { services: CaspService[]; unknown: string[] } {
  const found = new Set<CaspService>();
  const unknown: string[] = [];
  for (const raw of (v ?? "").split(/[|;]/)) {
    const s = raw.replace(/\s+/g, " ").trim().toLowerCase();
    if (s === "") continue;
    let svc: CaspService | null = null;
    if (s.includes("custody")) svc = "custody";
    else if (s.includes("trading platform")) svc = "trading_platform";
    else if (s.includes("exchange") && s.includes("funds")) svc = "exchange_funds";
    else if (s.includes("exchange") && s.includes("other")) svc = "exchange_crypto";
    else if (s.includes("execution")) svc = "execution";
    else if (s.includes("placing")) svc = "placing";
    else if (s.includes("reception") || s.includes("transmission")) svc = "rto";
    else if (s.includes("advice")) svc = "advice";
    else if (s.includes("portfolio")) svc = "portfolio";
    else if (s.includes("transfer")) svc = "transfer";
    else {
      const letter = /^([a-j])\s*[.)]/.exec(s)?.[1];
      if (letter) svc = LETTER_SERVICE[letter];
    }
    if (svc) found.add(svc);
    else unknown.push(raw.trim());
  }
  const order = Object.values(LETTER_SERVICE);
  return { services: order.filter((x) => found.has(x)), unknown };
}

function legalBasis(v: string | undefined): "art63" | "art60" | null {
  const s = (v ?? "").toLowerCase();
  if (/\b63\b/.test(s)) return "art63";
  if (/\b60\b/.test(s)) return "art60";
  return null;
}

function emtAuthorisation(v: string | undefined): IssuerAuthorisation | null {
  const s = (v ?? "").toLowerCase();
  if (s.includes("electronic money") || s.includes("e-money")) return "emi";
  if (s.includes("credit")) return "credit_institution";
  return null;
}

function yes(v: string | undefined): boolean {
  return /^(yes|true|y|1)$/i.test((v ?? "").trim());
}

// ---------------------------------------------------------------------
// Записи за базата (колоните на public.esma_register_entries)
// ---------------------------------------------------------------------
export type RegisterRow = {
  lei: string | null;
  lei_name: string | null;
  commercial_name: string | null;
  home_member_state: string | null;
  competent_authority: string | null;
  website: string | null;
  legal_basis: "art63" | "art60" | null;
  services: CaspService[];
  issuer_authorisation: IssuerAuthorisation | null;
  authorisation_date: string | null;
  authorisation_end_date: string | null;
  whitepaper_url: string | null;
  whitepaper_date: string | null;
  last_update: string | null;
  details: Record<string, string>;
};

export function mapRecords(kind: RegisterKind, records: Record<string, string>[]): { rows: RegisterRow[]; warnings: string[] } {
  const warnings: string[] = [];
  const rows = records.map((r, i): RegisterRow => {
    const svc = kind === "casp" ? parseServices(r.ac_serviceCode) : { services: [], unknown: [] };
    if (svc.unknown.length > 0) warnings.push(`ред ${i + 2}: неразпозната услуга „${svc.unknown.join(" | ")}“`);
    const leiRaw = r.ae_lei;
    const lei = normalizeLei(leiRaw);
    if (leiRaw && !lei) warnings.push(`ред ${i + 2}: невалидно LEI „${leiRaw}“`);
    return {
      lei,
      lei_name: r.ae_lei_name ?? null,
      commercial_name: r.ae_commercial_name ?? null,
      home_member_state: r.ae_homeMemberState?.toUpperCase().slice(0, 2) ?? null,
      competent_authority: r.ae_competentAuthority ?? null,
      website: r.ae_website ?? null,
      legal_basis: kind === "casp" ? legalBasis(r.ac_legal_basis) : null,
      services: svc.services,
      issuer_authorisation:
        kind === "emt"
          ? emtAuthorisation(r.ae_authorisation_other_emt)
          : kind === "art"
            ? yes(r.ae_credit_institution)
              ? "credit_institution"
              : "art_issuer"
            : null,
      authorisation_date: parseEsmaDate(r.ac_authorisationNotificationDate ?? r.ae_decision_date),
      authorisation_end_date: parseEsmaDate(r.ac_authorisationEndDate),
      whitepaper_url: r.wp_url ?? null,
      whitepaper_date: parseEsmaDate(r.wp_authorisationNotificationDate),
      last_update: parseEsmaDate(r.ac_lastupdate ?? r.wp_lastupdate ?? r.ae_lastupdate),
      details: r,
    };
  });
  return { rows, warnings };
}

// ---------------------------------------------------------------------
// Обобщена картина за едно LEI — това получава двигателят
// ---------------------------------------------------------------------
export type RegisterCaspEntry = {
  lei: string;
  name: string;
  commercial_name: string | null;
  authority: string | null;
  home_member_state: string | null;
  legal_basis: "art63" | "art60" | null;
  /** Услуги от действащите записи */
  services: CaspService[];
  authorised_on: string | null;
  /** Попълва се само ако всички записи са прекратени */
  ended_on: string | null;
};

export type RegisterIssuerEntry = {
  lei: string;
  name: string;
  authority: string | null;
  home_member_state: string | null;
  authorisation: IssuerAuthorisation | null;
  authorised_on: string | null;
  ended_on: string | null;
  whitepapers: { url: string; notified_on: string | null; last_update: string | null }[];
};

type EntryRow = Pick<
  RegisterRow,
  | "lei"
  | "lei_name"
  | "commercial_name"
  | "home_member_state"
  | "competent_authority"
  | "legal_basis"
  | "services"
  | "issuer_authorisation"
  | "authorisation_date"
  | "authorisation_end_date"
  | "whitepaper_url"
  | "whitepaper_date"
  | "last_update"
>;

const active = (r: EntryRow, today: string) => !r.authorisation_end_date || r.authorisation_end_date > today;
const minDate = (xs: (string | null)[]) => xs.filter((x): x is string => !!x).sort()[0] ?? null;
const maxDate = (xs: (string | null)[]) => xs.filter((x): x is string => !!x).sort().at(-1) ?? null;

/** Обединява всички записи на едно LEI в регистъра на доставчиците */
export function buildCaspEntry(rows: EntryRow[], today: string): RegisterCaspEntry | null {
  if (rows.length === 0) return null;
  const live = rows.filter((r) => active(r, today));
  const base = live[0] ?? rows[0];
  const services = new Set<CaspService>(live.flatMap((r) => r.services));
  const order = Object.values(LETTER_SERVICE);
  return {
    lei: base.lei ?? "",
    name: base.lei_name ?? "",
    commercial_name: base.commercial_name,
    authority: base.competent_authority,
    home_member_state: base.home_member_state,
    legal_basis: live.find((r) => r.legal_basis === "art63")?.legal_basis ?? base.legal_basis,
    services: order.filter((s) => services.has(s)),
    authorised_on: minDate((live.length ? live : rows).map((r) => r.authorisation_date)),
    ended_on: live.length === 0 ? maxDate(rows.map((r) => r.authorisation_end_date)) : null,
  };
}

/** Обединява записите на един емитент (по един ред за всяка бяла книга) */
export function buildIssuerEntry(rows: EntryRow[], today: string): RegisterIssuerEntry | null {
  if (rows.length === 0) return null;
  const live = rows.filter((r) => active(r, today));
  const base = live[0] ?? rows[0];
  const papers = new Map<string, { url: string; notified_on: string | null; last_update: string | null }>();
  for (const r of rows) {
    if (!r.whitepaper_url) continue;
    const prev = papers.get(r.whitepaper_url);
    if (!prev || (r.whitepaper_date ?? "") > (prev.notified_on ?? "")) {
      papers.set(r.whitepaper_url, { url: r.whitepaper_url, notified_on: r.whitepaper_date, last_update: r.last_update });
    }
  }
  return {
    lei: base.lei ?? "",
    name: base.lei_name ?? "",
    authority: base.competent_authority,
    home_member_state: base.home_member_state,
    authorisation: base.issuer_authorisation,
    authorised_on: minDate(rows.map((r) => r.authorisation_date)),
    ended_on: live.length === 0 ? maxDate(rows.map((r) => r.authorisation_end_date)) : null,
    whitepapers: [...papers.values()].sort((a, b) => (b.notified_on ?? "").localeCompare(a.notified_on ?? "")),
  };
}

/**
 * Коя от белите книги на емитента е за този токен.
 * Регистърът няма колона със символ, затова търсим символа в линка (напр. „mica-usdc-whitepaper“);
 * ако емитентът има само една бяла книга — ползваме нея.
 */
export function pickWhitepaper(
  entry: RegisterIssuerEntry,
  symbol: string
): RegisterIssuerEntry["whitepapers"][number] | null {
  const sym = symbol.trim().toLowerCase();
  if (sym.length >= 3) {
    const re = new RegExp(`(^|[^a-z0-9])${sym.replace(/[^a-z0-9]/g, "")}([^a-z0-9]|$)`);
    const hits = entry.whitepapers.filter((w) => re.test(w.url.toLowerCase()));
    if (hits.length > 0) return hits[0];
  }
  return entry.whitepapers.length === 1 ? entry.whitepapers[0] : null;
}

// ---------------------------------------------------------------------
// Синхронизация: сваляне -> проверки -> атомарна замяна в базата
// ---------------------------------------------------------------------
type DbResult<T> = PromiseLike<{ data: T | null; error: { message: string } | null; count?: number | null }>;

/** Минималната част от клиента на Supabase, която ползваме (клиент със secret ключ) */
export type SyncClient = {
  from(table: string): any;
  rpc(fn: string, args: Record<string, unknown>): DbResult<unknown>;
};

export type FileReport = {
  register: RegisterKind;
  url: string;
  ok: boolean;
  rows?: number;
  previous_rows?: number;
  bytes?: number;
  sha256?: string;
  unchanged?: boolean;
  warnings?: string[];
  error?: string;
};

export type SyncReport = { import_id: string | null; status: "succeeded" | "partial" | "failed"; files: FileReport[] };

async function sha256Hex(text: string): Promise<string> {
  const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function syncEsmaRegister(
  client: SyncClient,
  opts: { trigger: "script" | "cron"; fetchImpl?: typeof fetch; only?: RegisterKind[]; mirror?: boolean } = { trigger: "script" }
): Promise<SyncReport> {
  const doFetch = opts.fetchImpl ?? fetch;
  const kinds = opts.only ?? REGISTER_KINDS;

  const { data: imp, error: impErr } = await client
    .from("esma_register_imports")
    .insert({ trigger: opts.trigger, status: "running" })
    .select("id")
    .single();
  if (impErr || !imp) throw new Error(`Не може да се създаде запис за импорта: ${impErr?.message ?? "няма отговор"}`);
  const importId = (imp as { id: string }).id;

  const files: FileReport[] = [];
  for (const kind of kinds) {
    const url = opts.mirror ? ESMA_REGISTER_MIRROR[kind] : ESMA_REGISTER_FILES[kind];
    const rep: FileReport = { register: kind, url, ok: false };
    files.push(rep);
    try {
      const res = await doFetch(url, {
        headers: { "User-Agent": "MiCA-Guard register sync (+https://micaguard.eu)", Accept: "text/csv,*/*" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} при сваляне`);
      const text = await res.text();
      rep.bytes = text.length;
      rep.sha256 = await sha256Hex(text);

      const { headers, records } = toRecords(text);
      const missing = REQUIRED_HEADERS[kind].filter((h) => !headers.includes(h));
      if (missing.length > 0) throw new Error(`променен формат — липсват колони: ${missing.join(", ")}`);

      const { rows, warnings } = mapRecords(kind, records);
      rep.rows = rows.length;
      if (warnings.length > 0) rep.warnings = warnings.slice(0, 20);

      const { data: status } = await client
        .from("esma_register_status")
        .select("rows, sha256")
        .eq("register", kind)
        .maybeSingle();
      const prev = status as { rows: number; sha256: string | null } | null;
      rep.previous_rows = prev?.rows ?? 0;
      if (prev && prev.rows > 0 && rows.length < prev.rows * MIN_ROW_RATIO) {
        throw new Error(`отхвърлен: ${rows.length} реда спрямо ${prev.rows} досега (под ${MIN_ROW_RATIO * 100}%)`);
      }

      const { error } = await client.rpc("esma_replace_register", {
        p_import: importId,
        p_register: kind,
        p_source_url: url,
        p_sha256: rep.sha256,
        p_rows: rows,
      });
      if (error) throw new Error(`запис в базата: ${error.message}`);
      rep.unchanged = prev?.sha256 === rep.sha256;
      rep.ok = true;
    } catch (e) {
      rep.error = (e as Error).message;
    }
  }

  const okCount = files.filter((f) => f.ok).length;
  const status: SyncReport["status"] = okCount === files.length ? "succeeded" : okCount > 0 ? "partial" : "failed";
  await client
    .from("esma_register_imports")
    .update({ status, finished_at: new Date().toISOString(), files, error: files.find((f) => f.error)?.error ?? null })
    .eq("id", importId);

  return { import_id: importId, status, files };
}
