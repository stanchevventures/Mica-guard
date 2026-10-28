// =====================================================================
// MiCA-Guard — двигател за оценка на съответствието, v1.2
//
// Оценката е от гледна точка на организацията-клиент: какво трябва да е
// изпълнено, за да предоставя конкретни услуги за конкретен криптоактив.
//
// Всяка констатация има един от петте изхода:
//   pass              — изпълнено (има данни, които го потвърждават)
//   fail              — нарушение (данните показват неизпълнение)
//   evidence_required — липсват данни, за да се потвърди изпълнението
//   upcoming          — задължение със срок в бъдеще, още неизпълнено
//   not_applicable    — информативно / не се прилага
//
// Правна основа: Регламент (ЕС) 2023/1114 (MiCA); ESMA Q&A 2404, 2552,
// 2654; Становище на ESMA ESMA75-113276571-1742 от 08.10.2026.
// Източници на данни (по приоритет): регистър на ESMA по MiCA -> каталог ->
// декларация на потребителя.
// Описание на правилата: docs/RULES.md
//
// ВАЖНО: автоматизирана предварителна оценка — не е правно становище.
// =====================================================================

import type { RegisterCaspEntry, RegisterIssuerEntry } from "../esma/register";

export const ENGINE_VERSION = "mica-2026.10-v1.2";

export type Classification = "art" | "emt" | "other_crypto_asset" | "excluded" | "unclassified";
export type Severity = "info" | "low" | "medium" | "high" | "critical";
export type Outcome = "pass" | "fail" | "evidence_required" | "upcoming" | "not_applicable";
export type CheckResult = "compliant" | "partially_compliant" | "non_compliant" | "inconclusive";
/** Отговор с три състояния: да / не / не знам */
export type Tri = "yes" | "no" | "unknown";

/** Услуги за криптоактиви по чл. 3(1), т. 16, букви а)–й) — в реда на регламента */
export const CASP_SERVICES = [
  "custody", //          а) попечителство и администриране от името на клиенти
  "trading_platform", // б) управление на платформа за търговия
  "exchange_funds", //   в) обмен на криптоактиви срещу парични средства
  "exchange_crypto", //  г) обмен на криптоактиви срещу други криптоактиви
  "execution", //        д) изпълнение на нареждания от името на клиенти
  "placing", //          е) пласиране на криптоактиви
  "rto", //              ж) приемане и предаване на нареждания
  "advice", //           з) предоставяне на съвети
  "portfolio", //        и) управление на портфейл
  "transfer", //         й) услуги по прехвърляне от името на клиенти
] as const;

export type CaspService = (typeof CASP_SERVICES)[number];
export type Activity = CaspService | "offer_to_public";
export const ACTIVITIES: readonly Activity[] = [...CASP_SERVICES, "offer_to_public"];

/** Услуги, при които клиентите получават линк към бялата книга (чл. 66(3)) */
const LINK_SERVICES: readonly CaspService[] = [
  "trading_platform",
  "exchange_funds",
  "exchange_crypto",
  "advice",
  "portfolio",
];

/** Услуги, които могат да представляват публично предлагане на ART/EMT при промотиране (ESMA Q&A 2404) */
const PROMOTION_SENSITIVE: readonly CaspService[] = ["exchange_funds", "exchange_crypto", "execution", "rto"];

export type IssuerAuthorisation = "credit_institution" | "emi" | "art_issuer" | "none";

/** Факти за актива (от каталога) */
export type AssetFacts = {
  symbol: string;
  name: string;
  classification: Classification;
  /** true/false — установено в каталога; null — изисква преценка */
  identifiable_issuer: boolean | null;
  issuer_name: string | null;
  /** За ART/EMT: лиценз на емитента; "none" — известно е, че няма лиценз в ЕС */
  issuer_authorisation: IssuerAuthorisation | null;
  /** Вградена функция за анонимизиране (чл. 76(3)) */
  anonymisation_function: boolean;
  whitepaper_url: string | null;
  whitepaper_notified_at: string | null;
  is_significant: boolean;
  /** LEI на емитента (от каталога) — за проверка в регистъра на ESMA */
  issuer_lei?: string | null;
};

/** Факти за организацията (от Настройки) */
export type OrgFacts = {
  entity_type: string;
  casp_license_number: string | null;
  /** LEI на организацията — за проверка в регистъра на ESMA */
  lei?: string | null;
};

/**
 * Резултат от търсенето в регистъра на ESMA. `null`/липса = не е търсено
 * (няма LEI или регистърът още не е зареден); `entry: null` = търсено, но не е открито.
 */
export type RegisterEvidence = {
  /** `registered_lei` — LEI, както е вписано в регистъра, ако там има грешка при въвеждане */
  casp?: { as_of: string; lei: string; entry: RegisterCaspEntry | null; registered_lei?: string } | null;
  issuer?: { as_of: string; lei: string; register: "emt" | "art"; entry: RegisterIssuerEntry | null; whitepaper?: RegisterIssuerEntry["whitepapers"][number] | null } | null;
};

/** Отговори на потребителя във формата (декларации) */
export type Answers = {
  activities: Activity[];
  identifiable_issuer?: Tri;
  admission?: "new" | "before_mica" | "elsewhere_consent";
  whitepaper?: Tri;
  whitepaper_url?: string | null;
  whitepaper_notified_at?: string | null;
  suitability_documented?: Tri;
  holders_identifiable?: Tri;
  issuer_consent?: Tri;
};

export type EvidenceSource = "esma_register" | "catalog" | "user" | "org_settings" | "regulation";

export type Finding = {
  rule_code: string;
  mica_reference: string;
  title: string;
  outcome: Outcome;
  /** pass или not_applicable — за съвместимост с по-стари проверки */
  passed: boolean;
  severity: Severity;
  details: string;
  remediation: string | null;
  evidence: { source: EvidenceSource } & Record<string, unknown>;
};

export type EngineOutput = {
  findings: Finding[];
  result: CheckResult;
  risk_score: number;
  classification: Classification;
  counts: { fail: number; evidence_required: number; upcoming: number };
};

// ---------------------------------------------------------------------
// Ключови дати
// ---------------------------------------------------------------------
export const KEY_DATES = {
  /** Край на преходния режим за доставчици на услуги — чл. 143(3) */
  caspTransitionEnd: new Date("2026-07-01T23:59:59Z"),
  /** Срок за бяла книга за активи, допуснати до търговия преди 30.12.2024 — чл. 143(2)(б) */
  legacyWhitepaperDeadline: new Date("2027-12-31T23:59:59Z"),
  /**
   * Най-късен срок, до който националните органи следва да изискат уреждане на останалите
   * позиции в неотговарящи на MiCA ART/EMT — становище на ESMA от 08.10.2026, т. 27.
   * Самото задължение да не се предоставят услуги важи веднага (т. 12).
   */
  nonCompliantStablecoinDeadline: new Date("2027-01-08T23:59:59Z"),
} as const;

const ESMA_OPINION = "Становище на ESMA от 08.10.2026 (ESMA75-113276571-1742)";

// ---------------------------------------------------------------------
// Помощни функции
// ---------------------------------------------------------------------
function has(v: string | null | undefined): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function make(p: Omit<Finding, "passed">): Finding {
  return { ...p, passed: p.outcome === "pass" || p.outcome === "not_applicable" };
}

// Сроковете се броят в календарни дни: KEY_DATES съдържат последния ден на срока (UTC дата),
// а „днес“ се определя по българско време, за да съвпада с календара на потребителя.
const SOFIA_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Sofia",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function sofiaDayIndex(d: Date): number {
  const part = (t: string) => Number(SOFIA_DAY.formatToParts(d).find((p) => p.type === t)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day")) / 86_400_000;
}

/** Календарни дни до последния ден на срока; 0 = изтича днес, отрицателно = изтекъл. */
function daysLeft(now: Date, deadline: Date): number {
  const last = Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth(), deadline.getUTCDate()) / 86_400_000;
  return last - sofiaDayIndex(now);
}

function isOverdue(now: Date, deadline: Date): boolean {
  return daysLeft(now, deadline) < 0;
}

function remainingText(days: number): string {
  if (days <= 0) return "срокът изтича днес";
  return days === 1 ? "остава 1 ден" : `остават ${days} дни`;
}

/** Днешната дата по българско време, ISO (yyyy-mm-dd) */
function sofiaToday(now: Date): string {
  const d = new Date(sofiaDayIndex(now) * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** "2024-07-01" или ISO време -> "01.07.2024" */
function fmtDay(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : (iso ?? "—");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getUTCFullYear()}`;
}

export const SERVICE_LABEL: Record<Activity, string> = {
  custody: "попечителство и администриране",
  trading_platform: "платформа за търговия",
  exchange_funds: "обмен срещу парични средства",
  exchange_crypto: "обмен срещу криптоактиви",
  execution: "изпълнение на нареждания",
  placing: "пласиране",
  rto: "приемане и предаване на нареждания",
  advice: "съвети",
  portfolio: "управление на портфейл",
  transfer: "прехвърляне",
  offer_to_public: "публично предлагане",
};

type WhitepaperEvidence = {
  status: Tri;
  url: string | null;
  notified_at: string | null;
  source: EvidenceSource;
};

/** Приоритет: регистър на ESMA -> каталог -> декларация на потребителя */
function resolveWhitepaper(asset: AssetFacts, a: Answers, register?: RegisterEvidence["issuer"]): WhitepaperEvidence {
  const reg = register?.entry ? register.whitepaper : null;
  if (reg) {
    return { status: "yes", url: reg.url, notified_at: reg.notified_on, source: "esma_register" };
  }
  if (has(asset.whitepaper_url)) {
    return {
      status: "yes",
      url: asset.whitepaper_url,
      notified_at: asset.whitepaper_notified_at,
      source: "catalog",
    };
  }
  const status = a.whitepaper ?? "unknown";
  return {
    status,
    url: status === "yes" && has(a.whitepaper_url) ? a.whitepaper_url : null,
    notified_at: status === "yes" && has(a.whitepaper_notified_at) ? a.whitepaper_notified_at : null,
    source: "user",
  };
}

// =====================================================================
// Основна функция
// =====================================================================
export function runMicaRules(
  asset: AssetFacts,
  org: OrgFacts,
  answers: Answers,
  now: Date,
  register: RegisterEvidence = {}
): EngineOutput {
  const out: Finding[] = [];
  const acts = new Set<Activity>(answers.activities);
  const casp = CASP_SERVICES.filter((s) => acts.has(s));
  const offering = acts.has("offer_to_public");

  // ----------------------------------------------------------------
  // 1. Класификация
  // ----------------------------------------------------------------
  if (asset.classification === "unclassified") {
    out.push(
      make({
        rule_code: "CLS-001",
        mica_reference: "чл. 3(1), т. 5–7",
        title: "Класификация на криптоактива по MiCA",
        outcome: "evidence_required",
        severity: "high",
        details:
          "Активът не е класифициран. Без класификация не може да се определи дали се прилага Дял II (други криптоактиви), Дял III (ART) или Дял IV (EMT).",
        remediation:
          "Класифицирай актива по дефинициите в чл. 3(1), т. 5–7 и документирай основанието.",
        evidence: { source: "catalog", classification: asset.classification },
      })
    );
    return summarize(out, asset.classification);
  }

  if (asset.classification === "excluded") {
    out.push(
      make({
        rule_code: "CLS-002",
        mica_reference: "чл. 2",
        title: "Активът е отбелязан като извън обхвата на MiCA",
        outcome: "not_applicable",
        severity: "info",
        details:
          "Изключенията по чл. 2 (напр. финансови инструменти по MiFID II, депозити, уникални и незаменими криптоактиви) изискват индивидуален анализ. Може да се прилага друг режим (напр. MiFID II).",
        remediation: "Потвърди изключението с юрист и документирай основанието.",
        evidence: { source: "catalog", classification: asset.classification },
      })
    );
    return { ...summarize(out, asset.classification), result: "inconclusive" };
  }

  out.push(
    make({
      rule_code: "CLS-001",
      mica_reference: "чл. 3(1), т. 5–7",
      title: "Класификация на криптоактива по MiCA",
      outcome: "pass",
      severity: "info",
      details: `Класифициран като ${CLASS_TEXT[asset.classification]}.`,
      remediation: null,
      evidence: { source: "catalog", classification: asset.classification },
    })
  );

  // ----------------------------------------------------------------
  // 2. Лиценз на доставчика (само ако предоставя крипто услуги)
  // ----------------------------------------------------------------
  if (casp.length > 0) out.push(...authorisationRules(org, casp, asset, now, register.casp ?? null));

  // ----------------------------------------------------------------
  // 3. Правила според вида на актива
  // ----------------------------------------------------------------
  if (asset.classification === "emt" || asset.classification === "art") {
    const issuerReg = register.issuer?.register === asset.classification ? register.issuer : null;
    out.push(...stablecoinRules(asset.classification, asset, answers, casp, offering, now, issuerReg));
  } else {
    out.push(...titleTwoRules(asset, answers, casp, offering, now));
  }

  // ----------------------------------------------------------------
  // 4. Специфични изисквания към платформа за търговия (чл. 76)
  // ----------------------------------------------------------------
  if (acts.has("trading_platform")) out.push(...tradingPlatformRules(asset, answers));

  return summarize(out, asset.classification);
}

const CLASS_TEXT: Record<Classification, string> = {
  art: "токен, обвързан с активи (ART) — Дял III",
  emt: "токен за електронни пари (EMT) — Дял IV",
  other_crypto_asset: "криптоактив, различен от ART и EMT — Дял II",
  excluded: "извън обхвата",
  unclassified: "некласифициран",
};

// =====================================================================
// AUTH — лиценз на доставчика на услуги (чл. 59, 60, 63, 143(3))
// =====================================================================
/**
 * Субекти, които могат да предоставят услуги за криптоактиви с нотификация по чл. 60.
 * `allowed` — твърдо ограничение на услугите (ако има такова).
 */
const ART60: Record<string, { ref: string; scope: string; allowed?: CaspService[]; emtOnly?: boolean }> = {
  credit_institution: { ref: "чл. 60(1)", scope: "всички услуги за криптоактиви" },
  csd: { ref: "чл. 60(2)", scope: "само попечителство и администриране", allowed: ["custody"] },
  investment_firm: {
    ref: "чл. 60(3)",
    scope: "услуги, еквивалентни на инвестиционните услуги и дейности, за които има лиценз по MiFID II",
  },
  emi: {
    ref: "чл. 60(4)",
    scope: "само попечителство и администриране и прехвърляне — и то само за EMT, които самата институция издава",
    allowed: ["custody", "transfer"],
    emtOnly: true,
  },
  fund_manager: {
    ref: "чл. 60(5)",
    scope: "услуги, еквивалентни на управлението на портфейли и допълнителните услуги, за които има лиценз по Директиви 2009/65/ЕО или 2011/61/ЕС",
  },
  market_operator: {
    ref: "чл. 60(6)",
    scope: "само управление на платформа за търговия",
    allowed: ["trading_platform"],
  },
};

function authorisationRules(
  org: OrgFacts,
  services: CaspService[],
  asset: AssetFacts,
  now: Date,
  reg: RegisterEvidence["casp"]
): Finding[] {
  const out: Finding[] = [];
  const art60 = ART60[org.entity_type];
  const ref = art60 ? `чл. 59(1)(б), ${art60.ref}` : "чл. 59(1)(а), чл. 63";
  const list = services.map((s) => SERVICE_LABEL[s]).join(", ");
  const title = art60
    ? "Нотификация за предоставяне на услуги за криптоактиви"
    : "Лиценз на доставчик на услуги за криптоактиви (CASP)";
  const declared = has(org.casp_license_number) ? org.casp_license_number : null;
  const scopeText = art60 ? ` Обхват по ${art60.ref}: ${art60.scope}.` : "";
  const transitionOver = isOverdue(now, KEY_DATES.caspTransitionEnd);

  if (reg) {
    // ---- Проверка в регистъра на ESMA по LEI ----------------------------
    const e = reg.entry;
    const asOf = fmtDay(reg.as_of);
    const regEvidence = { source: "esma_register" as const, lei: reg.lei, register_as_of: reg.as_of, entry: e, casp_license_number: declared };

    if (e && e.ended_on && e.ended_on <= sofiaToday(now)) {
      out.push(
        make({
          rule_code: "AUTH-001",
          mica_reference: ref,
          title,
          outcome: "fail",
          severity: "critical",
          details: `Според регистъра на ESMA (към ${asOf}) ${e.legal_basis === "art60" ? "нотификацията" : "лицензът"} на ${e.name} (LEI ${e.lei}) е прекратен${e.legal_basis === "art60" ? "а" : ""} на ${fmtDay(e.ended_on)}. Услуги за криптоактиви могат да се предоставят само от лицензиран доставчик или от субект с нотификация по чл. 60.`,
          remediation: "Спри предоставянето на услугите и изясни статуса с компетентния орган.",
          evidence: regEvidence,
        })
      );
      return out;
    }

    if (e) {
      const basis =
        e.legal_basis === "art60"
          ? "нотификация по чл. 60"
          : e.legal_basis === "art63"
            ? "лиценз по чл. 63"
            : "вписан доставчик";
      out.push(
        make({
          rule_code: "AUTH-001",
          mica_reference: ref,
          title,
          outcome: "pass",
          severity: "info",
          details: `Регистър на ESMA (към ${asOf}): ${e.name} (LEI ${e.lei}) — ${basis}${e.authorised_on ? ` от ${fmtDay(e.authorised_on)}` : ""}; компетентен орган: ${e.authority ?? "—"}${e.home_member_state ? ` (${e.home_member_state})` : ""}.${
            reg.registered_lei ? ` В регистъра LEI е вписано като ${reg.registered_lei} (невалидни контролни цифри — вероятна грешка при въвеждане; организацията е идентифицирана по LEI ${reg.lei}, което се различава с един знак).` : ""
          }${declared ? ` Деклариран номер: ${declared}.` : ""}${scopeText}`,
          remediation: reg.registered_lei ? "Уведоми компетентния орган за грешката в LEI в регистъра." : null,
          evidence: regEvidence,
        })
      );

      // Обхват: всяка услуга трябва да е вписана в регистъра
      const missing = services.filter((s) => !e.services.includes(s));
      const registered = e.services.map((s) => SERVICE_LABEL[s]).join(", ");
      out.push(
        make({
          rule_code: "AUTH-003",
          mica_reference: e.legal_basis === "art60" ? `чл. 59(1)(б), ${art60?.ref ?? "чл. 60"}` : "чл. 59(1)(а), чл. 63",
          title: "Услугите са вписани в регистъра на ESMA",
          outcome: e.services.length === 0 ? "evidence_required" : missing.length === 0 ? "pass" : "fail",
          severity: e.services.length === 0 ? "medium" : missing.length === 0 ? "info" : "high",
          details:
            e.services.length === 0
              ? `Регистърът на ESMA (към ${asOf}) не съдържа данни за услугите на ${e.name}.`
              : missing.length === 0
                ? `Всички оценявани услуги са вписани в регистъра (към ${asOf}): ${list}.`
                : `В регистъра на ESMA (към ${asOf}) не са вписани услугите: ${missing.map((s) => SERVICE_LABEL[s]).join(", ")}. Вписани са: ${registered}. Доставчикът може да предоставя само услугите, за които има лиценз или нотификация.`,
          remediation:
            e.services.length === 0
              ? "Провери обхвата в решението на компетентния орган."
              : missing.length === 0
                ? null
                : "Не предоставяй тези услуги, докато обхватът не бъде разширен от компетентния орган. Ако разширението вече е одобрено, регистърът може още да не е обновен — пази решението в досието.",
          evidence: { source: "esma_register", lei: e.lei, register_as_of: reg.as_of, registered: e.services, requested: services, missing },
        })
      );
    } else {
      const notFound = `LEI ${reg.lei} не е открито в регистъра на ESMA (към ${asOf}).`;
      out.push(
        make({
          rule_code: "AUTH-001",
          mica_reference: transitionOver ? ref : `${ref}, чл. 143(3)`,
          title,
          outcome: "evidence_required",
          severity: !declared && transitionOver ? "critical" : "high",
          details: declared
            ? `${notFound} Деклариран номер: ${declared} (въведен в Настройки). ESMA обновява регистъра периодично — нов лиценз може да не е вписан веднага.`
            : transitionOver
              ? `${notFound} Не е въведен и номер на лиценз или нотификация. Преходният режим по чл. 143(3) изтече най-късно на 01.07.2026 — оттогава услуги за криптоактиви в ЕС могат да се предоставят само от лицензиран доставчик (чл. 63) или от субект с нотификация по чл. 60.`
              : `${notFound} Не е въведен и номер на лиценз или нотификация. Преходният режим по чл. 143(3) се прилага само за доставчици, които са предоставяли услугите по националното право преди 30.12.2024 — до 01.07.2026 (${remainingText(daysLeft(now, KEY_DATES.caspTransitionEnd))}) или до решението по заявлението им за лиценз, ако е по-рано.`,
          remediation: declared
            ? "Провери дали LEI в Настройки е правилно и дали лицензът е вписан; пази решението на компетентния орган в досието."
            : "Провери LEI в Настройки. Ако организацията няма лиценз или нотификация, предоставянето на услугите е забранено (чл. 59(1)).",
          evidence: regEvidence,
        })
      );
    }
  } else if (declared) {
    out.push(
      make({
        rule_code: "AUTH-001",
        mica_reference: ref,
        title,
        outcome: "pass",
        severity: "info",
        details: `Деклариран номер: ${declared} (въведен в Настройки).${scopeText}`,
        remediation: `Провери в регистъра на ESMA, че ${art60 ? "нотификацията" : "лицензът"} обхваща: ${list}.${
          art60 ? " Нотификацията се подава поне 40 работни дни преди първото предоставяне на услугите." : ""
        }${has(org.lei) ? "" : " Въведи LEI в Настройки — тогава проверката в регистъра на ESMA става автоматична."}`,
        evidence: { source: "org_settings", casp_license_number: declared, entity_type: org.entity_type },
      })
    );
  } else if (transitionOver) {
    out.push(
      make({
        rule_code: "AUTH-001",
        mica_reference: `${ref}, чл. 143(3)`,
        title,
        outcome: "evidence_required",
        severity: "critical",
        details:
          "Не е въведен номер на лиценз или нотификация. Преходният режим по чл. 143(3) изтече най-късно на 01.07.2026 — оттогава услуги за криптоактиви в ЕС могат да се предоставят само от лицензиран доставчик (чл. 63) или от субект с нотификация по чл. 60.",
        remediation:
          "Въведи LEI и номера на лиценза в Настройки на организацията. Ако организацията няма лиценз или нотификация, предоставянето на услугите е забранено (чл. 59(1)).",
        evidence: { source: "org_settings", casp_license_number: null, entity_type: org.entity_type },
      })
    );
  } else {
    // Преди 01.07.2026: преходният режим важи само за доставчици, които са предоставяли
    // услугите по националното право преди 30.12.2024 — не можем да го приемем по подразбиране.
    out.push(
      make({
        rule_code: "AUTH-001",
        mica_reference: `${ref}, чл. 143(3)`,
        title,
        outcome: "evidence_required",
        severity: "high",
        details: `Не е въведен номер на лиценз или нотификация. Преходният режим по чл. 143(3) се прилага само за доставчици, които са предоставяли услугите по националното право преди 30.12.2024 — до 01.07.2026 (${remainingText(daysLeft(now, KEY_DATES.caspTransitionEnd))}) или до решението по заявлението им за лиценз, ако е по-рано; държавата може да е определила по-кратък срок.`,
        remediation:
          "Ако организацията ползва преходния режим, документирай основанието и подай заявление по чл. 62 навреме; иначе услугите не могат да се предоставят без лиценз.",
        evidence: { source: "org_settings", casp_license_number: null, entity_type: org.entity_type },
      })
    );
  }

  // Обхват на субектите по чл. 60 с твърдо ограничени услуги (ДЦК, ИЕП, пазарен оператор)
  if (art60?.allowed) {
    const allowed = art60.allowed;
    const outside = services.filter((s) => !allowed.includes(s));
    const notEmt = art60.emtOnly === true && asset.classification !== "emt";
    const ok = outside.length === 0 && !notEmt;
    out.push(
      make({
        rule_code: "AUTH-002",
        mica_reference: art60.ref,
        title: "Обхват на услугите по нотификацията",
        outcome: ok ? "pass" : "fail",
        severity: ok ? "info" : "high",
        details: ok
          ? `Услугите са в обхвата по ${art60.ref}: ${art60.scope}.`
          : [
              outside.length > 0 &&
                `Услугите „${outside.map((s) => SERVICE_LABEL[s]).join(", ")}“ са извън обхвата по ${art60.ref} (${art60.scope}).`,
              notEmt && `${art60.ref} се отнася само до EMT, издадени от самата институция.`,
            ]
              .filter(Boolean)
              .join(" "),
        remediation: ok
          ? art60.emtOnly
            ? "Потвърди, че EMT е издаден от вашата институция."
            : null
          : "За други услуги или активи е нужен лиценз на доставчик на услуги за криптоактиви по чл. 63.",
        evidence: { source: "org_settings", entity_type: org.entity_type, services },
      })
    );
  }

  return out;
}

// =====================================================================
// ART / EMT — Дял III и IV + становище на ESMA от 08.10.2026
// =====================================================================
function stablecoinRules(
  kind: "emt" | "art",
  asset: AssetFacts,
  a: Answers,
  casp: CaspService[],
  offering: boolean,
  now: Date,
  reg: RegisterEvidence["issuer"]
): Finding[] {
  const out: Finding[] = [];
  const isEmt = kind === "emt";
  const P = isEmt ? "EMT" : "ART";

  // ---- 1. Лиценз на емитента ----------------------------------------
  // Приоритет: регистър на ESMA (по LEI на емитента) -> каталог.
  const validAuth: IssuerAuthorisation[] = isEmt ? ["credit_institution", "emi"] : ["art_issuer", "credit_institution"];
  const authText: Record<IssuerAuthorisation, string> = {
    credit_institution: "кредитна институция",
    emi: "институция за електронни пари",
    art_issuer: "лицензиран емитент на ART (чл. 21)",
    none: "няма лиценз в ЕС",
  };
  const catalogAuth = asset.issuer_authorisation;
  const catalogOk = catalogAuth !== null && validAuth.includes(catalogAuth);
  const catalogBad = catalogAuth !== null && !validAuth.includes(catalogAuth);
  const e = reg?.entry ?? null;
  const asOf = reg ? fmtDay(reg.as_of) : "";
  const regEnded = !!e?.ended_on && e.ended_on <= sofiaToday(now);

  let issuerStatus: "ok" | "bad" | "unknown";
  let issuerSeverity: Severity = "critical";
  let issuerSource: EvidenceSource = "catalog";
  let issuerDetails: string;
  let auth: IssuerAuthorisation | null = catalogAuth;

  if (e && !regEnded) {
    issuerStatus = "ok";
    issuerSource = "esma_register";
    auth = e.authorisation ?? (catalogOk ? catalogAuth : null);
    issuerDetails = `Регистър на ESMA (към ${asOf}): ${e.name} (LEI ${e.lei})${auth ? ` — ${authText[auth]}` : ""}; компетентен орган: ${e.authority ?? "—"}${e.home_member_state ? ` (${e.home_member_state})` : ""}.`;
  } else if (e && regEnded) {
    issuerStatus = "bad";
    issuerSource = "esma_register";
    issuerDetails = `Според регистъра на ESMA (към ${asOf}) записът на емитента ${e.name} (LEI ${e.lei}) е прекратен на ${fmtDay(e.ended_on)}. Токенът не отговаря на MiCA и не може да се предлага публично или да се допуска до търговия в ЕС.`;
  } else if (catalogBad) {
    issuerStatus = "bad";
    issuerDetails = `Емитент: ${asset.issuer_name ?? "—"} — ${authText[catalogAuth!]}.${reg ? ` LEI ${reg.lei} не е открито в регистъра на ESMA (към ${asOf}).` : ""} Токенът не отговаря на MiCA и не може да се предлага публично или да се допуска до търговия в ЕС.`;
  } else if (catalogOk && reg) {
    // Каталогът казва „лицензиран“, но регистърът не го потвърждава — не приемаме нито едното
    issuerStatus = "unknown";
    issuerSeverity = "high";
    issuerSource = "esma_register";
    issuerDetails = `Каталогът посочва ${asset.issuer_name ?? "емитента"} като ${authText[catalogAuth!]}, но LEI ${reg.lei} не е открито в регистъра на ${P} на ESMA (към ${asOf}).`;
  } else if (catalogOk) {
    issuerStatus = "ok";
    issuerDetails = `Емитент: ${asset.issuer_name ?? "—"} (${authText[catalogAuth!]}).`;
  } else {
    issuerStatus = "unknown";
    issuerDetails = `Няма данни за лиценза на емитента.${reg ? ` LEI ${reg.lei} не е открито в регистъра на ${P} на ESMA (към ${asOf}).` : ""}`;
  }
  const issuerKnownBad = issuerStatus === "bad";

  out.push(
    make({
      rule_code: `${P}-001`,
      mica_reference: isEmt ? "чл. 48(1)(а)" : "чл. 16(1)(а) и (б), чл. 17, чл. 21",
      title: isEmt
        ? "Емитентът е кредитна институция или институция за електронни пари"
        : "Емитентът е лицензиран за ART или е кредитна институция",
      outcome: issuerStatus === "ok" ? "pass" : issuerStatus === "bad" ? "fail" : "evidence_required",
      severity: issuerStatus === "ok" ? "info" : issuerSeverity,
      details: issuerDetails,
      remediation:
        issuerStatus === "ok"
          ? issuerSource === "esma_register"
            ? null
            : "Периодично проверявай лиценза в регистъра на ESMA."
          : issuerKnownBad
            ? "Не предлагай публично токена и не го допускай до търговия; за другите услуги виж STB-001."
            : `Провери в регистъра на ESMA дали емитентът е ${isEmt ? "кредитна институция или институция за е-пари" : "лицензиран по чл. 21 или кредитна институция по чл. 17"}.`,
      evidence: {
        source: issuerSource,
        issuer_name: e?.name ?? asset.issuer_name,
        issuer_lei: reg?.lei ?? asset.issuer_lei ?? null,
        issuer_authorisation: auth,
        ...(reg ? { register_as_of: reg.as_of, found_in_register: !!e } : {}),
      },
    })
  );

  // ---- 2. Неотговарящ токен: услугите трябва да се прекратят ---------
  if (issuerKnownBad) {
    if (casp.length > 0) {
      const days = daysLeft(now, KEY_DATES.nonCompliantStablecoinDeadline);
      const overdue = days < 0;
      out.push(
        make({
          rule_code: "STB-001",
          mica_reference: `чл. 66(1); ${ESMA_OPINION}`,
          title: "Услуги с неотговарящ на MiCA стейбълкойн",
          outcome: "fail",
          severity: "critical",
          details: `Според становището на ESMA доставчиците не следва да предоставят услуги за неотговарящи на MiCA ART/EMT — платформа, обмен, нареждания, пласиране, съвети, портфейл, попечителство и прехвърляне. Предоставянето им се презумира за несъвместимо със задължението по чл. 66(1); становището е адресирано до националните органи. Услуги, които представляват публично предлагане или допускане до търговия (напр. листване), са забранени още от 30.06.2024 (ESMA Q&A 2404). Националните органи следва да изискат уреждане на останалите позиции възможно най-скоро и най-късно до ${fmtDate(KEY_DATES.nonCompliantStablecoinDeadline)}${
            overdue ? " — срокът е изтекъл" : ` (${remainingText(days)})`
          }. Ограничени услуги за продажба, конвертиране, изтегляне, прехвърляне или съхранение на съществуващи позиции са възможни само ако компетентният орган ги допусне.`,
          remediation:
            "Спри нови покупки, търговия и промотиране; уведоми клиентите; съгласувай с надзорния орган плана за уреждане на съществуващите позиции и го документирай.",
          evidence: { source: "regulation", services: casp, deadline: "2027-01-08" },
        })
      );
    }
    if (offering) {
      out.push(
        make({
          rule_code: `${P}-005`,
          mica_reference: isEmt ? "чл. 48(1)" : "чл. 16(1)",
          title: "Публично предлагане на неотговарящ токен",
          outcome: "fail",
          severity: "critical",
          details: `Публично предлагане на ${P} в ЕС е допустимо само от лицензиран емитент или с негово писмено съгласие.`,
          remediation: "Прекрати предлагането.",
          evidence: { source: "regulation" },
        })
      );
    }
    return out;
  }

  // ---- 3. Бяла книга ------------------------------------------------
  const wp = resolveWhitepaper(asset, a, reg);
  const wpRef = isEmt ? "чл. 48(1)(б), чл. 51(11) и (13)" : "чл. 17(1)(а), чл. 21, чл. 28";
  const wpTitle = isEmt
    ? "Бялата книга на EMT е нотифицирана и публикувана"
    : "Бялата книга на ART е одобрена и публикувана";
  const verb = isEmt ? "нотифицирана" : "одобрена";
  const wpEvidence = { source: wp.source, whitepaper_url: wp.url, notified_at: wp.notified_at, status: wp.status };

  if (wp.status === "yes" && has(wp.notified_at)) {
    out.push(
      make({
        rule_code: `${P}-002`,
        mica_reference: wpRef,
        title: wpTitle,
        outcome: "pass",
        severity: "info",
        details: `Публикувана: ${wp.url}; ${verb} на ${fmtDay(wp.notified_at)}${
          wp.source === "esma_register" ? ` (регистър на ESMA към ${asOf})` : wp.source === "catalog" ? " (данни от каталога)" : ""
        }.`,
        remediation: null,
        evidence: wpEvidence,
      })
    );
  } else if (wp.status === "yes") {
    out.push(
      make({
        rule_code: `${P}-002`,
        mica_reference: wpRef,
        title: wpTitle,
        outcome: "evidence_required",
        severity: "medium",
        details: `Публикувана: ${wp.url}. Няма дата, потвърждаваща, че бялата книга е ${verb} от компетентния орган.`,
        remediation: "Провери в регистъра на ESMA и въведи датата.",
        evidence: wpEvidence,
      })
    );
  } else {
    out.push(
      make({
        rule_code: `${P}-002`,
        mica_reference: wpRef,
        title: wpTitle,
        outcome: wp.status === "no" ? "fail" : "evidence_required",
        severity: "high",
        details:
          wp.status === "no"
            ? `Декларирано е, че няма публикувана бяла книга. ${P} не може да се предлага публично или да се допуска до търговия без нея.`
            : "Няма данни за публикувана бяла книга.",
        remediation: "Намери бялата книга в регистъра на ESMA или на сайта на емитента.",
        evidence: wpEvidence,
      })
    );
  }

  // ---- 4. Писмено съгласие на емитента ------------------------------
  // При публично предлагане изискването следва пряко от текста (висока тежест).
  // При листване от платформа то следва от консервативно тълкуване (средна тежест):
  // ESMA Q&A 2404 изрично квалифицира като „търсене на допускане“ листването на токени
  // на нелицензирани емитенти; MiCA-Guard прилага същата логика и за лицензирани.
  const tp = casp.includes("trading_platform");
  if (tp || offering) {
    const consent = a.issuer_consent ?? "unknown";
    out.push(
      make({
        rule_code: `${P}-003`,
        mica_reference: `${isEmt ? "чл. 48(1), ал. 2" : "чл. 16(1), ал. 2"}${tp && !offering ? "; ESMA Q&A 2404 (по аналогия)" : ""}`,
        title: "Писмено съгласие на емитента",
        outcome: consent === "yes" ? "pass" : consent === "no" ? "fail" : "evidence_required",
        severity: consent === "yes" ? "info" : offering ? "high" : "medium",
        details: `${
          offering
            ? "Публичното предлагане от лице, различно от емитента, е допустимо само с писменото му съгласие."
            : "Лице, различно от емитента, може да търси допускане до търговия само с писменото му съгласие. Когато платформата допуска токена по своя инициатива, MiCA-Guard прилага консервативното тълкуване, че тя търси допускането (по аналогия с ESMA Q&A 2404). Съгласие не е нужно, ако допускането е поискано от самия емитент или организацията е емитентът."
        } ${
          consent === "yes"
            ? "Декларирано е, че съгласието е налично."
            : consent === "no"
              ? "Декларирано е, че няма писмено съгласие."
              : "Няма данни за писмено съгласие."
        }`,
        remediation:
          consent === "yes"
            ? "Съхранявай съгласието в досието на актива."
            : "Поискай писмено съгласие от емитента (освен ако организацията е самият емитент).",
        evidence: { source: "user", issuer_consent: consent },
      })
    );
  }

  // ---- 5. Обмен/нареждания при промотиране -----------------------------
  const promo = casp.filter((s) => PROMOTION_SENSITIVE.includes(s));
  if (promo.length > 0 && !tp && !offering) {
    out.push(
      make({
        rule_code: `${P}-004`,
        mica_reference: "ESMA Q&A 2404",
        title: "Промотиране на токена при обмен или нареждания",
        outcome: "not_applicable",
        severity: "info",
        details:
          "Обменът, изпълнението и предаването на нареждания може да представляват публично предлагане, ако доставчикът промотира или рекламира токена. Това се преценява за всеки отделен случай.",
        remediation: "Ако промотирате токена, осигурете писмено съгласие на емитента.",
        evidence: { source: "regulation", services: promo },
      })
    );
  }

  // ---- 6. Линк към бялата книга за клиентите ------------------------
  const linkServices = casp.filter((s) => LINK_SERVICES.includes(s));
  if (linkServices.length > 0 && wp.status === "yes" && has(wp.url)) {
    out.push(linkFinding(wp, linkServices));
  }

  // ---- 7. Значим токен ------------------------------------------------
  if (asset.is_significant) {
    out.push(
      make({
        rule_code: "SIG-001",
        mica_reference: isEmt ? "чл. 56–58, чл. 117(4)" : "чл. 43–45, чл. 117(1)",
        title: "Значим токен — засилени изисквания към емитента",
        outcome: "not_applicable",
        severity: "info",
        details: isEmt
          ? "Емитентът на значим EMT има допълнителни задължения (чл. 58). Когато емитентът е институция за електронни пари, ЕБО надзирава спазването на чл. 55 и 58 (чл. 117(4)); кредитните институции остават под надзора на националния орган."
          : "Емитентът на значим ART извършва дейността си под надзора на ЕБО (чл. 117(1)) и има допълнителни задължения (чл. 45).",
        remediation: null,
        evidence: { source: "catalog", is_significant: true },
      })
    );
  }

  return out;
}

// =====================================================================
// Други криптоактиви — Дял II
// =====================================================================
function titleTwoRules(
  asset: AssetFacts,
  a: Answers,
  casp: CaspService[],
  offering: boolean,
  now: Date
): Finding[] {
  const out: Finding[] = [];
  const tp = casp.includes("trading_platform");
  const linkServices = casp.filter((s) => LINK_SERVICES.includes(s));
  const relevant = offering || tp || linkServices.length > 0;

  if (!relevant) {
    out.push(
      make({
        rule_code: "WP-000",
        mica_reference: "чл. 4, чл. 5, чл. 66(3)",
        title: "Задължения, свързани с бялата книга",
        outcome: "not_applicable",
        severity: "info",
        details:
          "При попечителство, прехвърляне, изпълнение или предаване на нареждания и пласиране доставчикът не носи задължения за изготвяне на бяла книга или за линк към нея.",
        remediation: null,
        evidence: { source: "regulation", services: casp },
      })
    );
    return out;
  }

  // ---- 1. Има ли идентифицируем емитент? (съображение 22; ESMA Q&A 2552)
  let issuer: Tri;
  let issuerSource: EvidenceSource;
  if (asset.identifiable_issuer === true) {
    issuer = "yes";
    issuerSource = "catalog";
  } else if (asset.identifiable_issuer === false) {
    issuer = "no";
    issuerSource = "catalog";
  } else {
    issuer = a.identifiable_issuer ?? "unknown";
    issuerSource = "user";
  }

  const docNote = tp
    ? " Платформата е длъжна да определи дали има идентифицируем емитент (ESMA Q&A 2552); добра практика е преценката да се документира."
    : " Добра практика е основанията за преценката да се документират.";

  out.push(
    make({
      rule_code: "ISS-001",
      mica_reference: "съображение 22; ESMA Q&A 2552",
      title: "Идентифицируем емитент",
      outcome: issuer === "unknown" ? "evidence_required" : "pass",
      severity: issuer === "unknown" ? "medium" : "info",
      details:
        issuer === "yes"
          ? `Активът има идентифицируем емитент${has(asset.issuer_name) ? ` (${asset.issuer_name})` : ""} — прилагат се изискванията на Дял II.`
          : issuer === "no"
            ? `Активът няма идентифицируем емитент (${issuerSource === "user" ? "по преценка на организацията" : "оценка в каталога"}). Според съображение 22 такива активи са извън Дял II; според отговора на Комисията в ESMA Q&A 2552 за тях не се изисква бяла книга.${docNote}`
            : "Не е определено дали активът има идентифицируем емитент. От това зависи дали се изисква бяла книга. Докато не бъде определено, задълженията по Дял II се оценяват като потенциално приложими.",
      remediation:
        issuer === "unknown"
          ? "Определи и документирай дали има лице, което издава или контролира актива (напр. юридическо лице, фондация, известен екип)."
          : null,
      evidence: { source: issuerSource, identifiable_issuer: issuer },
    })
  );

  const wp = resolveWhitepaper(asset, a);
  const wpEvidence = { source: wp.source, whitepaper_url: wp.url, notified_at: wp.notified_at, status: wp.status };

  if (issuer === "no") {
    // Платформите дават линк само когато бяла книга се изисква (ESMA Q&A 2552), но
    // обменът, съветите и портфейлът дават линк към всяка съществуваща регистрирана
    // бяла книга (чл. 66(3); ESMA Q&A 2654) — напр. доброволно нотифицирана.
    const otherLinkServices = linkServices.filter((s) => s !== "trading_platform");
    if (otherLinkServices.length > 0) {
      if (wp.status === "yes" && has(wp.url)) {
        out.push(linkFinding(wp, otherLinkServices));
      } else {
        out.push(
          make({
            rule_code: "LNK-001",
            mica_reference: "чл. 66(3); ESMA Q&A 2654",
            title: "Линк към бялата книга за клиентите",
            outcome: wp.status === "no" ? "not_applicable" : "evidence_required",
            severity: wp.status === "no" ? "info" : "low",
            details:
              wp.status === "no"
                ? "Декларирано е, че няма регистрирана бяла книга, към която да се предоставя линк."
                : "Бяла книга не е задължителна за актива, но ако в регистъра на ESMA има регистрирана такава (напр. доброволно нотифицирана), при обмен, съвети и управление на портфейл клиентите трябва да получат линк към нея.",
            remediation:
              wp.status === "no" ? null : "Провери регистъра на ESMA; ако има регистрирана бяла книга, предоставяй линк към нея.",
            evidence: { source: wp.source, status: wp.status },
          })
        );
      }
    }
    return out;
  }

  // При неопределен емитент нарушенията се отчитат като „нужни са данни“
  const conditional = issuer === "unknown";
  const cap = (f: Finding): Finding =>
    conditional && f.outcome === "fail" ? make({ ...f, outcome: "evidence_required" }) : f;

  // ---- 2. Публично предлагане (чл. 4) ---------------------------------
  if (offering) {
    out.push(
      cap(
        make({
          rule_code: "WP-OFR",
          mica_reference: "чл. 4(1)(б) и (г), чл. 6, чл. 9",
          title: "Бяла книга за публичното предлагане",
          outcome: wp.status === "yes" ? "pass" : wp.status === "no" ? "fail" : "evidence_required",
          severity: wp.status === "yes" ? "info" : "high",
          details:
            wp.status === "yes"
              ? `Бяла книга: ${wp.url}`
              : `${wp.status === "no" ? "Декларирано е, че няма бяла книга." : "Няма данни за бяла книга."} Оферентът трябва да изготви, нотифицира и публикува бяла книга, освен ако се прилага изключение (виж WP-OFR-X).`,
          remediation:
            wp.status === "yes" ? null : "Изготви, нотифицирай и публикувай бяла книга или документирай приложимото изключение.",
          evidence: wpEvidence,
        })
      )
    );
    if (wp.status === "yes") {
      out.push(notificationFinding("WP-OFR-N", "чл. 4(1)(в), чл. 8(5)", wp));
    } else {
      out.push(
        make({
          rule_code: "WP-OFR-X",
          mica_reference: "чл. 4(2) и (3)",
          title: "Изключения от задължението за бяла книга при публично предлагане",
          outcome: "not_applicable",
          severity: "info",
          details:
            "Чл. 4(2) освобождава само от изготвяне, нотифициране и публикуване на бялата книга и публикуване на маркетинговите съобщения (чл. 4(1)(б), (в), (г) и (е)); изискванията за юридическо лице, маркетингови съобщения по чл. 7 и чл. 14 остават. Прилага се при: предлагане на по-малко от 150 физически или юридически лица на държава членка, действащи за своя сметка; общо възнаграждение в ЕС до 1 000 000 EUR за 12 месеца от началото на предлагането; или предлагане само към квалифицирани инвеститори, когато активът може да се държи само от тях. Чл. 4(3) изключва изцяло Дял II при: безплатно предлагане (не е безплатно, ако купувачите предоставят лични данни или оферентът получава такси или облаги); актив, автоматично създаден като възнаграждение за поддръжка на регистъра или валидиране на транзакции; utility токен за съществуваща или функционираща стока или услуга; използване само в ограничена мрежа от търговци (над 1 000 000 EUR за 12 месеца се изисква уведомление до компетентния орган, който може да откаже изключението).",
          remediation: "Ако се позоваваш на изключение, документирай основанието и изчисленията.",
          evidence: { source: "regulation" },
        })
      );
    }
  }

  // ---- 3. Допускане до търговия (чл. 5, 76(1), 143(2)) ----------------
  if (tp) {
    const admission = a.admission ?? "new";

    if (admission === "before_mica") {
      const deadline = KEY_DATES.legacyWhitepaperDeadline;
      const overdue = isOverdue(now, deadline);
      const complete = wp.status === "yes" && has(wp.notified_at);
      let outcome: Outcome;
      let severity: Severity;
      if (complete) {
        outcome = "pass";
        severity = "info";
      } else if (!overdue) {
        outcome = "upcoming";
        severity = "medium";
      } else {
        outcome = wp.status === "no" ? "fail" : "evidence_required";
        severity = "high";
      }
      out.push(
        cap(
          make({
            rule_code: "WP-143",
            mica_reference: "чл. 143(2); ESMA Q&A 2654",
            title: "Бяла книга за актив, допуснат до търговия преди 30.12.2024",
            outcome,
            severity,
            details: complete
              ? `Бяла книга: ${wp.url}; нотифицирана на ${fmtDay(wp.notified_at)}.`
              : `${
                  wp.status === "yes"
                    ? `Бялата книга е налична (${wp.url}), но няма данни за нотифицирането ѝ.`
                    : wp.status === "no"
                      ? "Декларирано е, че няма бяла книга."
                      : "Няма данни за бяла книга."
                } Операторът на платформата трябва да осигури изготвена, нотифицирана и публикувана бяла книга (чл. 6, 8 и 9), актуализирана по чл. 12, до ${fmtDate(deadline)}. ${
                  overdue ? "Срокът е изтекъл." : `${capitalize(remainingText(daysLeft(now, deadline)))}.`
                } Маркетинговите съобщения след 30.12.2024 трябва да отговарят на чл. 7 и 9.`,
            remediation: complete
              ? null
              : wp.status === "yes"
                ? "Провери в регистъра на ESMA дали бялата книга е нотифицирана и въведи датата."
                : "Осигури бяла книга — изготвена от платформата или от друго лице — нотифицирана и публикувана по чл. 6, 8 и 9 (ESMA Q&A 2654).",
            evidence: { ...wpEvidence, admission },
          })
        )
      );
    } else if (admission === "elsewhere_consent") {
      out.push(
        cap(
          make({
            rule_code: "WP-054",
            mica_reference: "чл. 5(4)",
            title: "Използване на съществуваща бяла книга (актив, допуснат на друга платформа в ЕС)",
            outcome: wp.status === "yes" ? "pass" : wp.status === "no" ? "fail" : "evidence_required",
            severity: wp.status === "yes" ? "info" : "high",
            details:
              wp.status === "yes"
                ? `Използва се бяла книга ${wp.url} с писмено съгласие на нейния автор (декларирано). Изключението освобождава само от изготвяне, нотифициране и публикуване (чл. 5(1)(б)–(г)); изискванията за маркетингови съобщения (чл. 7 и 9) и чл. 14 продължават да се прилагат.`
                : "Изключението изисква съществуваща бяла книга, изготвена по чл. 6 и актуализирана по чл. 12, и писмено съгласие на автора ѝ.",
            remediation:
              wp.status === "yes"
                ? "Съхранявай писменото съгласие и следи за актуализации на бялата книга."
                : "Добави линк към бялата книга, за която има съгласие, или изготви собствена.",
            evidence: { ...wpEvidence, admission },
          })
        )
      );
    } else {
      out.push(
        cap(
          make({
            rule_code: "WP-001",
            mica_reference: "чл. 5(1)(б) и (г), чл. 5(2)–(3), чл. 76(1)",
            title: "Бяла книга за допускането до търговия",
            outcome: wp.status === "yes" ? "pass" : wp.status === "no" ? "fail" : "evidence_required",
            severity: wp.status === "yes" ? "info" : "high",
            details:
              wp.status === "yes"
                ? `Бяла книга: ${wp.url}`
                : `${wp.status === "no" ? "Декларирано е, че няма бяла книга." : "Няма данни за бяла книга."} Операционните правила на платформата трябва да предвиждат, че актив без публикувана бяла книга не се допуска до търговия (чл. 76(1)). Ако допускането е по инициатива на оператора, задълженията са негови (чл. 5(2)); ако го иска друго лице, то изготвя бялата книга, освен ако с писмено споразумение задължението е прехвърлено на оператора (чл. 5(3)).`,
            remediation:
              wp.status === "yes"
                ? null
                : "Изготви бяла книга, получи такава от лицето, което иска допускането, или използвай изключението по чл. 5(4).",
            evidence: { ...wpEvidence, admission },
          })
        )
      );
      if (wp.status === "yes") out.push(notificationFinding("WP-002", "чл. 5(1)(в), чл. 8(5)", wp));
    }
  }

  // ---- 4. Линк към бялата книга (чл. 66(3); ESMA Q&A 2654) ------------
  if (linkServices.length > 0) {
    if (wp.status === "yes" && has(wp.url)) {
      out.push(linkFinding(wp, linkServices));
    } else if (wp.status === "no") {
      out.push(
        make({
          rule_code: "LNK-001",
          mica_reference: "чл. 66(3)",
          title: "Линк към бялата книга за клиентите",
          outcome: "not_applicable",
          severity: "info",
          details: "Няма бяла книга, към която да се предоставя линк.",
          remediation: null,
          evidence: { source: wp.source, status: wp.status },
        })
      );
    } else if (!tp) {
      // При платформа липсата на данни вече е отчетена в правилата за бялата книга
      out.push(
        cap(
          make({
            rule_code: "LNK-001",
            mica_reference: "чл. 66(3); ESMA Q&A 2654",
            title: "Линк към бялата книга за клиентите",
            outcome: "evidence_required",
            severity: "low",
            details:
              "Доставчиците на обмен, съвети и управление на портфейл предоставят на клиентите линк към всяка налична (регистрирана) бяла книга. Те не отговарят за изготвянето ѝ.",
            remediation: "Провери регистъра на ESMA; ако има регистрирана бяла книга, предоставяй линк към нея.",
            evidence: { source: wp.source, status: wp.status },
          })
        )
      );
    }
  }

  return out;
}

// =====================================================================
// Платформа за търговия — чл. 76(2) и 76(3)
// =====================================================================
function tradingPlatformRules(asset: AssetFacts, a: Answers): Finding[] {
  const out: Finding[] = [];
  const suit = a.suitability_documented ?? "unknown";
  const issuerless = asset.identifiable_issuer === false || a.identifiable_issuer === "no";

  out.push(
    make({
      rule_code: "SUIT-001",
      mica_reference: "чл. 76(2); ESMA Q&A 2552",
      title: "Оценка на пригодността преди допускане до търговия",
      outcome: suit === "yes" ? "pass" : suit === "no" ? "fail" : "evidence_required",
      severity: suit === "yes" ? "info" : "high",
      details: `Преди допускане операторът оценява пригодността на актива: надеждност на техническите решения, възможна връзка с незаконни или измамни дейности и опит, история и репутация на емитента и екипа му.${
        issuerless
          ? " Отделно операторът определя дали активът има идентифицируем емитент (ESMA Q&A 2552)."
          : ""
      } ${
        suit === "yes"
          ? "Декларирано е, че оценката е документирана."
          : suit === "no"
            ? "Декларирано е, че няма документирана оценка."
            : "Няма данни за документирана оценка."
      }`,
      remediation: suit === "yes" ? "Преразглеждай оценката периодично и при съществени промени." : "Извърши и документирай оценката преди допускането.",
      evidence: { source: "user", suitability_documented: suit },
    })
  );

  if (asset.anonymisation_function) {
    const ident = a.holders_identifiable ?? "unknown";
    out.push(
      make({
        rule_code: "ANON-001",
        mica_reference: "чл. 76(3)",
        title: "Криптоактив с вградена функция за анонимизиране",
        outcome: ident === "yes" ? "pass" : ident === "no" ? "fail" : "evidence_required",
        severity: ident === "yes" ? "info" : "critical",
        details: `Операционните правила трябва да не допускат до търговия криптоактиви с вградена функция за анонимизиране, освен ако притежателите и историята на транзакциите им могат да бъдат идентифицирани от оператора. ${
          ident === "yes"
            ? "Декларирано е, че идентифицирането е възможно."
            : ident === "no"
              ? "Декларирано е, че идентифицирането не е възможно."
              : "Няма данни дали идентифицирането е възможно."
        }`,
        remediation:
          ident === "yes"
            ? "Документирай механизма, чрез който се идентифицират притежателите и историята на транзакциите."
            : "Не допускай актива до търговия, освен ако идентифицирането е технически осигурено и документирано.",
        evidence: { source: "catalog", anonymisation_function: true, holders_identifiable: ident },
      })
    );
  } else {
    out.push(
      make({
        rule_code: "ANON-001",
        mica_reference: "чл. 76(3)",
        title: "Криптоактив с вградена функция за анонимизиране",
        outcome: "pass",
        severity: "info",
        details: "Според каталога активът няма вградена функция за анонимизиране.",
        remediation: null,
        evidence: { source: "catalog", anonymisation_function: false },
      })
    );
  }

  return out;
}

// =====================================================================
// Общи констатации
// =====================================================================
function notificationFinding(code: string, ref: string, wp: WhitepaperEvidence): Finding {
  const ok = has(wp.notified_at);
  return make({
    rule_code: code,
    mica_reference: ref,
    title: "Нотифициране на бялата книга към компетентния орган",
    outcome: ok ? "pass" : "evidence_required",
    severity: ok ? "info" : "medium",
    details: ok
      ? `Нотифицирана на ${fmtDay(wp.notified_at)}.`
      : "Няма дата на нотифициране. Бялата книга се нотифицира поне 20 работни дни преди публикуването ѝ (чл. 8(5)); предварително одобрение не се изисква (чл. 8(3)).",
    remediation: ok ? null : "Провери в регистъра на ESMA и въведи датата.",
    evidence: { source: wp.source, notified_at: wp.notified_at },
  });
}

function linkFinding(wp: WhitepaperEvidence, services: CaspService[]): Finding {
  return make({
    rule_code: "LNK-001",
    mica_reference: "чл. 66(3)",
    title: "Линк към бялата книга за клиентите",
    outcome: "pass",
    severity: "info",
    details: `Линк за клиентите: ${wp.url}`,
    remediation: `Увери се, че линкът е видим за клиентите при услугите: ${services.map((s) => SERVICE_LABEL[s]).join(", ")}.`,
    evidence: { source: wp.source, whitepaper_url: wp.url },
  });
}

// =====================================================================
// Обобщение: резултат и рисков резултат
// =====================================================================
const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];
/** Рискът се определя от най-тежкия проблем ... */
const BASE: Record<Severity, number> = { critical: 80, high: 55, medium: 30, low: 10, info: 0 };
/** ... плюс добавка за всеки следващ проблем (максимум 100) */
const INCREMENT: Record<Severity, number> = { critical: 10, high: 7, medium: 4, low: 2, info: 0 };

function isIssue(f: Finding): boolean {
  return f.outcome === "fail" || f.outcome === "evidence_required" || f.outcome === "upcoming";
}

function summarize(findings: Finding[], classification: Classification): EngineOutput {
  const issues = findings
    .filter(isIssue)
    .sort((x, y) => SEVERITY_ORDER.indexOf(x.severity) - SEVERITY_ORDER.indexOf(y.severity));

  const risk_score =
    issues.length === 0
      ? 0
      : Math.min(100, BASE[issues[0].severity] + issues.slice(1).reduce((s, f) => s + INCREMENT[f.severity], 0));

  const severe = (f: Finding) => f.severity === "critical" || f.severity === "high";
  let result: CheckResult;
  if (findings.some((f) => f.outcome === "fail" && severe(f))) result = "non_compliant";
  else if (findings.some((f) => f.outcome === "evidence_required" && severe(f))) result = "inconclusive";
  else if (issues.some((f) => f.severity !== "info")) result = "partially_compliant";
  else result = "compliant";

  return {
    findings,
    result,
    risk_score,
    classification,
    counts: {
      fail: findings.filter((f) => f.outcome === "fail").length,
      evidence_required: findings.filter((f) => f.outcome === "evidence_required").length,
      upcoming: findings.filter((f) => f.outcome === "upcoming").length,
    },
  };
}
