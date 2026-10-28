// Търсене в копието на регистъра на ESMA (таблиците от миграция 0005).
// Ползва се на сървъра — с клиента на потребителя (регистърът е публичен, само за четене).
import type { RegisterEvidence } from "@/lib/mica/engine";
import {
  buildCaspEntry,
  buildIssuerEntry,
  ESMA_REGISTER_FILES,
  findMistypedLei,
  pickWhitepaper,
  type RegisterCaspEntry,
  type RegisterKind,
} from "./register";

/** След толкова дни без обновяване показваме предупреждение */
export const REGISTER_STALE_DAYS = 14;

const ENTRY_COLUMNS =
  "lei, lei_name, commercial_name, home_member_state, competent_authority, legal_basis, services, issuer_authorisation, authorisation_date, authorisation_end_date, whitepaper_url, whitepaper_date, last_update";

export type RegisterStatus = { last_success_at: string; source_url: string; rows: number };
export type RegisterStatusMap = Partial<Record<RegisterKind, RegisterStatus>>;

// Клиентът на Supabase (типът идва от @supabase/ssr)
type Client = { from(table: string): any };

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Кога е обновен всеки регистър. Празно, ако миграция 0005 не е пусната или няма импорт. */
export async function loadRegisterStatus(supabase: Client): Promise<RegisterStatusMap> {
  const { data, error } = await supabase.from("esma_register_status").select("register, last_success_at, source_url, rows");
  if (error || !data) return {};
  const map: RegisterStatusMap = {};
  for (const r of data as (RegisterStatus & { register: RegisterKind })[]) {
    map[r.register] = { last_success_at: r.last_success_at, source_url: r.source_url, rows: r.rows };
  }
  return map;
}

/** Данните не са свалени директно от сайта на ESMA (резервното копие) */
export function isMirror(status: RegisterStatus | undefined): boolean {
  return !!status && !Object.values(ESMA_REGISTER_FILES).includes(status.source_url as never);
}

export function isStale(status: RegisterStatus | undefined, now = new Date()): boolean {
  return !!status && now.getTime() - new Date(status.last_success_at).getTime() > REGISTER_STALE_DAYS * 86_400_000;
}

async function entries(supabase: Client, register: RegisterKind, lei: string) {
  const { data, error } = await supabase.from("esma_register_entries").select(ENTRY_COLUMNS).eq("register", register).eq("lei", lei);
  if (error) throw new Error(error.message);
  return (data ?? []) as Parameters<typeof buildCaspEntry>[0];
}

export async function lookupCasp(
  supabase: Client,
  lei: string,
  status: RegisterStatusMap
): Promise<RegisterEvidence["casp"]> {
  const s = status.casp;
  if (!s) return null;
  let rows = await entries(supabase, "casp", lei);
  let registered_lei: string | undefined;
  if (rows.length === 0) {
    // Възможна грешка в LEI в самия регистър
    const { data } = await supabase.from("esma_register_entries").select("lei").eq("register", "casp").not("lei", "is", null);
    const alt = findMistypedLei(lei, ((data ?? []) as { lei: string }[]).map((r) => r.lei));
    if (alt) {
      rows = await entries(supabase, "casp", alt);
      registered_lei = alt;
    }
  }
  return { as_of: s.last_success_at, lei, entry: buildCaspEntry(rows, todayIso()), ...(registered_lei ? { registered_lei } : {}) };
}

/**
 * Данните от регистъра за проверката. Ако регистърът не е зареден или търсенето
 * се провали, връща празен резултат — проверката продължава с каталога и декларациите.
 */
export async function buildRegisterEvidence(
  supabase: Client,
  p: { orgLei: string | null; issuerLei: string | null; classification: string; symbol: string }
): Promise<RegisterEvidence> {
  try {
    const status = await loadRegisterStatus(supabase);
    const out: RegisterEvidence = {};
    const orgLei = p.orgLei?.trim() || null;
    const issuerLei = p.issuerLei?.trim() || null;

    if (orgLei) out.casp = await lookupCasp(supabase, orgLei, status);

    const kind = p.classification === "emt" || p.classification === "art" ? p.classification : null;
    if (kind && issuerLei && status[kind]) {
      const entry = buildIssuerEntry(await entries(supabase, kind, issuerLei), todayIso());
      out.issuer = {
        as_of: status[kind]!.last_success_at,
        lei: issuerLei,
        register: kind,
        entry,
        whitepaper: entry ? pickWhitepaper(entry, p.symbol) : null,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export type { RegisterCaspEntry };
