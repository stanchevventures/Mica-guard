// =====================================================================
// MiCA двигател — v0 (preview)
//
// ВАЖНО: това са опростени, автоматични правила за демонстрация на
// веригата. НЕ са правно становище и трябва да минат правен преглед,
// преди да се ползват с реални клиенти.
// =====================================================================

export type Classification =
  | "art"
  | "emt"
  | "other_crypto_asset"
  | "excluded"
  | "unclassified";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type CheckResult =
  | "compliant"
  | "partially_compliant"
  | "non_compliant"
  | "inconclusive";

export type AssetInput = {
  symbol: string;
  name: string;
  mica_classification: Classification;
  issuer_name: string | null;
  whitepaper_url: string | null;
  whitepaper_notified_at: string | null;
  is_significant: boolean;
};

export type Finding = {
  rule_code: string;
  mica_reference: string;
  title: string;
  passed: boolean;
  severity: Severity;
  details: string;
  remediation: string | null;
};

export type EngineOutput = {
  findings: Finding[];
  result: CheckResult;
  risk_score: number;
  classification: Classification;
};

const SEVERITY_WEIGHT: Record<Severity, number> = {
  info: 0,
  low: 5,
  medium: 15,
  high: 25,
  critical: 40,
};

// Препратки според вида токен
const REF = {
  whitepaper: {
    other_crypto_asset: "Дял II, чл. 4–6",
    art: "Дял III, чл. 19",
    emt: "Дял IV, чл. 51",
  },
  notification: {
    other_crypto_asset: "Дял II, чл. 8",
    art: "Дял III, чл. 21",
    emt: "Дял IV, чл. 51(11)",
  },
  issuer: {
    art: "Дял III, чл. 16",
    emt: "Дял IV, чл. 48",
  },
  significant: {
    art: "Дял III, чл. 43–45",
    emt: "Дял IV, чл. 56–58",
  },
} as const;

export function runMicaRules(asset: AssetInput): EngineOutput {
  const c = asset.mica_classification;
  const findings: Finding[] = [];

  // CLS-001 — има ли класификация
  if (c === "unclassified") {
    findings.push({
      rule_code: "CLS-001",
      mica_reference: "чл. 3(1)",
      title: "Класификация на криптоактива по MiCA",
      passed: false,
      severity: "high",
      details: "Активът не е класифициран като ART, EMT или друг криптоактив.",
      remediation: "Определи вида на актива спрямо дефинициите в чл. 3(1).",
    });
    return summarize(findings, c);
  }

  // Извън обхвата — оценката спира тук
  if (c === "excluded") {
    findings.push({
      rule_code: "CLS-002",
      mica_reference: "чл. 2",
      title: "Активът е отбелязан като извън обхвата на MiCA",
      passed: true,
      severity: "info",
      details:
        "Изключенията по чл. 2 (напр. финансови инструменти, уникални NFT) изискват индивидуален правен анализ.",
      remediation: "Потвърди изключението с юрист и документирай основанието.",
    });
    return { ...summarize(findings, c), result: "inconclusive" };
  }

  findings.push({
    rule_code: "CLS-001",
    mica_reference: "чл. 3(1)",
    title: "Класификация на криптоактива по MiCA",
    passed: true,
    severity: "info",
    details: `Класифициран като ${LABEL[c]}.`,
    remediation: null,
  });

  // ISS-001 — идентифициран емитент (задължително за ART и EMT)
  if (c === "art" || c === "emt") {
    const ok = Boolean(asset.issuer_name?.trim());
    findings.push({
      rule_code: "ISS-001",
      mica_reference: REF.issuer[c],
      title:
        c === "emt"
          ? "Емитентът е кредитна институция или институция за е-пари"
          : "Емитентът е лицензирано юридическо лице в ЕС",
      passed: ok,
      severity: "critical",
      details: ok
        ? `Емитент: ${asset.issuer_name}.`
        : "Не е посочен емитент. Публично предлагане без лицензиран емитент не е допустимо.",
      remediation: ok ? null : "Посочи емитента и провери лиценза му в регистъра на ESMA.",
    });
  }

  // WP-001 — бяла книга
  const hasWp = Boolean(asset.whitepaper_url?.trim());
  findings.push({
    rule_code: "WP-001",
    mica_reference: REF.whitepaper[c],
    title: "Наличие на бяла книга (crypto-asset white paper)",
    passed: hasWp,
    severity: "high",
    details: hasWp
      ? `Бяла книга: ${asset.whitepaper_url}`
      : "Не е предоставена бяла книга за актива.",
    remediation: hasWp ? null : "Приложи линк към публикуваната бяла книга.",
  });

  // WP-002 — нотификация/одобрение от национален компетентен орган
  const notified = Boolean(asset.whitepaper_notified_at);
  findings.push({
    rule_code: "WP-002",
    mica_reference: REF.notification[c],
    title:
      c === "art"
        ? "Бялата книга е одобрена от компетентния орган"
        : "Бялата книга е нотифицирана към компетентния орган",
    passed: notified,
    severity: "medium",
    details: notified
      ? `Дата на нотифициране/одобрение: ${asset.whitepaper_notified_at}.`
      : "Няма данни за нотифициране/одобрение от НКО.",
    remediation: notified
      ? null
      : "Въведи датата на нотифициране и провери вписването в регистъра на ESMA.",
  });

  // SIG-001 — значим токен (информативно)
  if ((c === "art" || c === "emt") && asset.is_significant) {
    findings.push({
      rule_code: "SIG-001",
      mica_reference: REF.significant[c],
      title: "Значим токен — засилени изисквания",
      passed: true,
      severity: "info",
      details: "Значимите токени са под надзор на ЕБО и имат допълнителни изисквания.",
      remediation: null,
    });
  }

  return summarize(findings, c);
}

const LABEL: Record<Classification, string> = {
  art: "токен, обвързан с активи (ART)",
  emt: "токен за електронни пари (EMT)",
  other_crypto_asset: "друг криптоактив (Дял II)",
  excluded: "извън обхвата",
  unclassified: "некласифициран",
};

function summarize(findings: Finding[], classification: Classification): EngineOutput {
  const failed = findings.filter((f) => !f.passed);
  const risk_score = Math.min(
    100,
    failed.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0)
  );

  let result: CheckResult = "compliant";
  if (failed.some((f) => f.severity === "critical" || f.severity === "high")) {
    result = "non_compliant";
  } else if (failed.length > 0) {
    result = "partially_compliant";
  }

  return { findings, result, risk_score, classification };
}
