// Тестове на MiCA двигателя v1.2. Пускане (Node 22.6+): node tests/mica-engine.test.mts
import { runMicaRules, type AssetFacts, type OrgFacts, type Answers, type RegisterEvidence } from "../src/lib/mica/engine.ts";

const NOW = new Date("2026-10-27T12:00:00Z");

const base: AssetFacts = {
  symbol: "X", name: "X", classification: "other_crypto_asset", identifiable_issuer: null, issuer_name: null,
  issuer_authorisation: null, anonymisation_function: false, whitepaper_url: null, whitepaper_notified_at: null, is_significant: false,
};
const BTC: AssetFacts = { ...base, symbol: "BTC", identifiable_issuer: false };
const ETH: AssetFacts = { ...base, symbol: "ETH", identifiable_issuer: null };
const XMR: AssetFacts = { ...base, symbol: "XMR", identifiable_issuer: false, anonymisation_function: true };
const TOKEN: AssetFacts = { ...base, symbol: "TKN", identifiable_issuer: true, issuer_name: "Acme AD" };
const USDC: AssetFacts = {
  ...base, symbol: "USDC", classification: "emt", identifiable_issuer: true, issuer_name: "Circle Internet Financial Europe SAS",
  issuer_authorisation: "emi", whitepaper_url: "https://www.circle.com/legal/mica-usdc-whitepaper", whitepaper_notified_at: "2024-07-01",
};
const USDT: AssetFacts = { ...base, symbol: "USDT", classification: "emt", identifiable_issuer: true, issuer_name: "Tether", issuer_authorisation: "none" };
const EMT_UNKNOWN: AssetFacts = { ...USDC, symbol: "EMTX", issuer_authorisation: null, whitepaper_url: null, whitepaper_notified_at: null };
const ART: AssetFacts = { ...base, symbol: "ARTX", classification: "art", identifiable_issuer: true, issuer_name: "Art Issuer SA", issuer_authorisation: "art_issuer", whitepaper_url: "https://x.eu/art.pdf", whitepaper_notified_at: "2025-03-01" };
const UNC: AssetFacts = { ...base, symbol: "UNC", classification: "unclassified" };
const EXC: AssetFacts = { ...base, symbol: "EXC", classification: "excluded" };

const casp: OrgFacts = { entity_type: "casp", casp_license_number: "BG-001" };
const unlicensed: OrgFacts = { entity_type: "casp", casp_license_number: null };
const emi: OrgFacts = { entity_type: "emi", casp_license_number: "EMI-NOTIF-1" };
const issuerOrg: OrgFacts = { entity_type: "issuer", casp_license_number: null };
const csd: OrgFacts = { entity_type: "csd", casp_license_number: "CSD-NOTIF-1" };
const marketOperator: OrgFacts = { entity_type: "market_operator", casp_license_number: "MO-NOTIF-1" };
const fundManager: OrgFacts = { entity_type: "fund_manager", casp_license_number: "FM-NOTIF-1" };

type Expect = { result: string; risk?: number; outcomes?: Record<string, string>; absent?: string[] };
let passed = 0, failed = 0;

function check(name: string, asset: AssetFacts, org: OrgFacts, ans: Answers, exp: Expect, now = NOW, reg: RegisterEvidence = {}) {
  const r = runMicaRules(asset, org, ans, now, reg);
  const errors: string[] = [];
  if (r.result !== exp.result) errors.push(`result=${r.result}, очакван ${exp.result}`);
  if (exp.risk !== undefined && r.risk_score !== exp.risk) errors.push(`risk=${r.risk_score}, очакван ${exp.risk}`);
  for (const [code, outcome] of Object.entries(exp.outcomes ?? {})) {
    const f = r.findings.find((x) => x.rule_code === code);
    if (!f) errors.push(`липсва ${code}`);
    else if (`${f.outcome}/${f.severity}` !== outcome && f.outcome !== outcome) errors.push(`${code}=${f.outcome}/${f.severity}, очакван ${outcome}`);
  }
  for (const code of exp.absent ?? []) if (r.findings.some((x) => x.rule_code === code)) errors.push(`${code} не трябва да присъства`);
  for (const f of r.findings) {
    if (f.passed !== (f.outcome === "pass" || f.outcome === "not_applicable")) errors.push(`${f.rule_code}: passed не съответства на outcome`);
    if (!f.title || !f.details || !f.mica_reference) errors.push(`${f.rule_code}: празно поле`);
  }
  if (r.risk_score < 0 || r.risk_score > 100) errors.push("risk извън 0–100");
  if (errors.length) { failed++; console.log(`✗ ${name}\n    ${errors.join("\n    ")}\n    → ${r.findings.map((f) => `${f.rule_code}:${f.outcome}/${f.severity}`).join(" ")}`); }
  else { passed++; console.log(`✓ ${name.padEnd(62)} ${r.result.padEnd(20)} риск ${r.risk_score}`); }
}

// ---- Bitcoin: без идентифицируем емитент (ESMA Q&A 2552) ----
check("01 BTC платформа, лиценз, оценка на пригодността", BTC, casp, { activities: ["trading_platform"], suitability_documented: "yes" },
  { result: "compliant", risk: 0, outcomes: { "AUTH-001": "pass", "ISS-001": "pass", "SUIT-001": "pass", "ANON-001": "pass" }, absent: ["WP-001", "WP-143", "LNK-001"] });
check("02 BTC платформа, без данни за оценката", BTC, casp, { activities: ["trading_platform"] },
  { result: "inconclusive", risk: 55, outcomes: { "SUIT-001": "evidence_required/high" } });
check("03 BTC обмен, без данни за регистрирана бяла книга (Q&A 2654)", BTC, casp, { activities: ["exchange_funds"] },
  { result: "partially_compliant", risk: 10, outcomes: { "ISS-001": "pass", "LNK-001": "evidence_required/low" }, absent: ["SUIT-001"] });
check("03b BTC обмен, няма регистрирана бяла книга", BTC, casp, { activities: ["exchange_funds"], whitepaper: "no" },
  { result: "compliant", risk: 0, outcomes: { "LNK-001": "not_applicable" } });
check("03c BTC обмен, доброволна регистрирана бяла книга", BTC, casp, { activities: ["advice"], whitepaper: "yes", whitepaper_url: "https://casp.eu/btc-wp.pdf" },
  { result: "compliant", risk: 0, outcomes: { "LNK-001": "pass" } });
check("03d BTC само платформа — линк не се изисква (Q&A 2552)", BTC, casp, { activities: ["trading_platform"], suitability_documented: "yes" },
  { result: "compliant", absent: ["LNK-001"] });
check("04 BTC попечителство без лиценз (след 01.07.2026)", BTC, unlicensed, { activities: ["custody"] },
  { result: "inconclusive", risk: 80, outcomes: { "AUTH-001": "evidence_required/critical", "WP-000": "not_applicable" } });
check("05 BTC попечителство без лиценз (юни 2026 — преходният режим не се предполага)", BTC, unlicensed, { activities: ["custody"] },
  { result: "inconclusive", risk: 55, outcomes: { "AUTH-001": "evidence_required/high" } }, new Date("2026-06-15T12:00:00Z"));

// ---- Ethereum: емитентът изисква преценка ----
check("06 ETH платформа, емитент неопределен", ETH, casp, { activities: ["trading_platform"], suitability_documented: "yes", identifiable_issuer: "unknown" },
  { result: "inconclusive", risk: 59, outcomes: { "ISS-001": "evidence_required/medium", "WP-001": "evidence_required/high" } });
check("07 ETH платформа, организацията преценява: няма емитент", ETH, casp, { activities: ["trading_platform"], suitability_documented: "yes", identifiable_issuer: "no" },
  { result: "compliant", risk: 0, outcomes: { "ISS-001": "pass" }, absent: ["WP-001"] });
check("08 Актив с емитент, допуснат преди 30.12.2024 — в срок", ETH, casp, { activities: ["trading_platform"], suitability_documented: "yes", identifiable_issuer: "yes", admission: "before_mica" },
  { result: "partially_compliant", risk: 30, outcomes: { "WP-143": "upcoming/medium" } });
check("09 Същият актив през 2028, няма бяла книга", ETH, casp, { activities: ["trading_platform"], suitability_documented: "yes", identifiable_issuer: "yes", admission: "before_mica", whitepaper: "no" },
  { result: "non_compliant", outcomes: { "WP-143": "fail/high" } }, new Date("2028-02-01T12:00:00Z"));
check("10 Същият актив, 2028, няма данни", ETH, casp, { activities: ["trading_platform"], suitability_documented: "yes", identifiable_issuer: "yes", admission: "before_mica" },
  { result: "inconclusive", outcomes: { "WP-143": "evidence_required/high" } }, new Date("2028-02-01T12:00:00Z"));
check("11 Неопределен емитент + декларирано „няма бяла книга“ → не е нарушение", ETH, casp, { activities: ["trading_platform"], suitability_documented: "yes", identifiable_issuer: "unknown", whitepaper: "no" },
  { result: "inconclusive", outcomes: { "WP-001": "evidence_required/high" } });

// ---- Токен с емитент (Дял II) ----
check("12 Токен, ново допускане, пълна бяла книга", TOKEN, casp, { activities: ["trading_platform"], suitability_documented: "yes", admission: "new", whitepaper: "yes", whitepaper_url: "https://acme.eu/wp.pdf", whitepaper_notified_at: "2025-05-01" },
  { result: "compliant", risk: 0, outcomes: { "WP-001": "pass", "WP-002": "pass", "LNK-001": "pass" } });
check("13 Токен, ново допускане, няма бяла книга", TOKEN, casp, { activities: ["trading_platform"], suitability_documented: "yes", admission: "new", whitepaper: "no" },
  { result: "non_compliant", risk: 55, outcomes: { "WP-001": "fail/high" }, absent: ["WP-002"] });
check("14 Токен, чл. 5(4) със съществуваща бяла книга", TOKEN, casp, { activities: ["trading_platform"], suitability_documented: "yes", admission: "elsewhere_consent", whitepaper: "yes", whitepaper_url: "https://other.eu/wp.pdf" },
  { result: "compliant", outcomes: { "WP-054": "pass" } });
check("15 Токен, обмен, няма данни за бяла книга", TOKEN, casp, { activities: ["exchange_funds"] },
  { result: "partially_compliant", risk: 10, outcomes: { "LNK-001": "evidence_required/low" } });
check("16 Токен, обмен, бяла книга не съществува", TOKEN, casp, { activities: ["exchange_crypto"], whitepaper: "no" },
  { result: "compliant", outcomes: { "LNK-001": "not_applicable" } });
check("17 Публично предлагане без бяла книга (без лиценз — не се изисква)", TOKEN, issuerOrg, { activities: ["offer_to_public"], whitepaper: "no" },
  { result: "non_compliant", outcomes: { "WP-OFR": "fail/high", "WP-OFR-X": "not_applicable" }, absent: ["AUTH-001", "WP-OFR-N"] });
check("18 Публично предлагане, бяла книга без дата на нотифициране", TOKEN, issuerOrg, { activities: ["offer_to_public"], whitepaper: "yes", whitepaper_url: "https://acme.eu/wp.pdf" },
  { result: "partially_compliant", risk: 30, outcomes: { "WP-OFR": "pass", "WP-OFR-N": "evidence_required/medium" } });

// ---- Стейбълкойни ----
check("19 USDC обмен (данни от каталога)", USDC, casp, { activities: ["exchange_funds"] },
  { result: "compliant", risk: 0, outcomes: { "EMT-001": "pass", "EMT-002": "pass", "EMT-004": "not_applicable", "LNK-001": "pass" } });
check("20 USDC платформа без данни за съгласие (консервативно тълкуване)", USDC, casp, { activities: ["trading_platform"], suitability_documented: "yes" },
  { result: "partially_compliant", risk: 30, outcomes: { "EMT-003": "evidence_required/medium" } });
check("20b USDC публично предлагане без съгласие (пряк текст на чл. 48(1))", USDC, issuerOrg, { activities: ["offer_to_public"], issuer_consent: "no" },
  { result: "non_compliant", outcomes: { "EMT-003": "fail/high" } });
check("21 USDC платформа със съгласие", USDC, casp, { activities: ["trading_platform"], suitability_documented: "yes", issuer_consent: "yes" },
  { result: "compliant", risk: 0, outcomes: { "EMT-003": "pass", "LNK-001": "pass" } });
check("22 USDT попечителство и прехвърляне (становище 08.10.2026)", USDT, casp, { activities: ["custody", "transfer"] },
  { result: "non_compliant", risk: 90, outcomes: { "EMT-001": "fail/critical", "STB-001": "fail/critical" }, absent: ["EMT-002", "EMT-003"] });
check("23 USDT публично предлагане", USDT, issuerOrg, { activities: ["offer_to_public"] },
  { result: "non_compliant", outcomes: { "EMT-005": "fail/critical" }, absent: ["STB-001"] });
check("24 EMT с непознат лиценз на емитента", EMT_UNKNOWN, casp, { activities: ["exchange_funds"] },
  { result: "inconclusive", outcomes: { "EMT-001": "evidence_required/critical", "EMT-002": "evidence_required/high" } });
check("25 ART с лицензиран емитент, платформа, съгласие", ART, casp, { activities: ["trading_platform"], suitability_documented: "yes", issuer_consent: "yes" },
  { result: "compliant", outcomes: { "ART-001": "pass", "ART-002": "pass", "ART-003": "pass" } });

// ---- Анонимизиращи активи (чл. 76(3)) ----
check("26 XMR платформа, без данни за идентифициране", XMR, casp, { activities: ["trading_platform"], suitability_documented: "yes" },
  { result: "inconclusive", risk: 80, outcomes: { "ANON-001": "evidence_required/critical" } });
check("27 XMR платформа, идентифицирането е невъзможно", XMR, casp, { activities: ["trading_platform"], suitability_documented: "yes", holders_identifiable: "no" },
  { result: "non_compliant", outcomes: { "ANON-001": "fail/critical" } });
check("28 XMR попечителство (чл. 76(3) не се прилага)", XMR, casp, { activities: ["custody"] },
  { result: "compliant", absent: ["ANON-001"] });

// ---- Институция за е-пари (чл. 60(4)) ----
check("29 ИЕП: попечителство и прехвърляне на EMT", USDC, emi, { activities: ["custody", "transfer"] },
  { result: "compliant", outcomes: { "AUTH-002": "pass" } });
check("30 ИЕП: обмен на EMT (извън обхвата)", USDC, emi, { activities: ["exchange_funds"] },
  { result: "non_compliant", outcomes: { "AUTH-002": "fail/high" } });
check("31 ИЕП: попечителство на BTC (не е EMT)", BTC, emi, { activities: ["custody"] },
  { result: "non_compliant", outcomes: { "AUTH-002": "fail/high" } });
check("31b ДЦК: платформа (извън чл. 60(2))", BTC, csd, { activities: ["trading_platform"], suitability_documented: "yes" },
  { result: "non_compliant", outcomes: { "AUTH-002": "fail/high" } });
check("31c ДЦК: попечителство (в обхвата)", BTC, csd, { activities: ["custody"] },
  { result: "compliant", outcomes: { "AUTH-002": "pass" } });
check("31d Пазарен оператор: платформа (чл. 60(6))", BTC, marketOperator, { activities: ["trading_platform"], suitability_documented: "yes" },
  { result: "compliant", outcomes: { "AUTH-002": "pass" } });
check("31e Пазарен оператор: попечителство (извън обхвата)", BTC, marketOperator, { activities: ["custody"] },
  { result: "non_compliant", outcomes: { "AUTH-002": "fail/high" } });
check("31f Управляващо дружество: без твърдо ограничение", BTC, fundManager, { activities: ["portfolio"], whitepaper: "no" },
  { result: "compliant", outcomes: { "AUTH-001": "pass" }, absent: ["AUTH-002"] });

// ---- Класификация и граници ----
check("32 Некласифициран актив", UNC, casp, { activities: ["custody"] }, { result: "inconclusive", risk: 55, outcomes: { "CLS-001": "evidence_required/high" } });
check("33 Актив извън обхвата", EXC, casp, { activities: ["custody"] }, { result: "inconclusive", risk: 0, outcomes: { "CLS-002": "not_applicable" } });
check("34 Много проблеми наведнъж — рискът е до 100", { ...XMR }, unlicensed, { activities: ["trading_platform", "exchange_funds"], holders_identifiable: "no", suitability_documented: "no" },
  { result: "non_compliant", risk: 99, outcomes: { "LNK-001": "evidence_required/low", "ANON-001": "fail/critical" } });

// ---- Срокове: календарни дни по българско време ----
function deadline(name: string, asset: AssetFacts, org: OrgFacts, ans: Answers, now: Date, code: string, outcome: string, text: string) {
  const f = runMicaRules(asset, org, ans, now).findings.find((x) => x.rule_code === code);
  const errors: string[] = [];
  if (!f) errors.push(`липсва ${code}`);
  else {
    if (f.outcome !== outcome) errors.push(`${code}=${f.outcome}, очакван ${outcome}`);
    if (!f.details.includes(text)) errors.push(`текстът не съдържа „${text}“: ${f.details.slice(0, 160)}…`);
  }
  if (errors.length) { failed++; console.log(`✗ ${name}\n    ${errors.join("\n    ")}`); }
  else { passed++; console.log(`✓ ${name}`); }
}
const custody = { activities: ["custody"] } as Answers;
deadline("35 STB-001: 28.10.2026 → остават 72 дни до 08.01.2027", USDT, casp, custody, new Date("2026-10-28T09:30:00Z"), "STB-001", "fail", "(остават 72 дни)");
deadline("36 STB-001: 07.01.2027 → остава 1 ден", USDT, casp, custody, new Date("2027-01-07T10:00:00Z"), "STB-001", "fail", "(остава 1 ден)");
deadline("37 STB-001: 08.01.2027, 23:30 българско време → изтича днес", USDT, casp, custody, new Date("2027-01-08T21:30:00Z"), "STB-001", "fail", "(срокът изтича днес)");
deadline("38 STB-001: 09.01.2027, 00:30 българско време → изтекъл", USDT, casp, custody, new Date("2027-01-08T22:30:00Z"), "STB-001", "fail", "— срокът е изтекъл");
deadline("39 WP-143: 28.10.2026 → остават 429 дни до 31.12.2027", TOKEN, casp, { activities: ["trading_platform"], admission: "before_mica", suitability_documented: "yes" },
  new Date("2026-10-28T09:30:00Z"), "WP-143", "upcoming", "Остават 429 дни.");
deadline("40 AUTH-001: 01.07.2026, 23:00 българско време → преходният режим още тече", BTC, unlicensed, custody, new Date("2026-07-01T20:00:00Z"), "AUTH-001", "evidence_required", "(срокът изтича днес)");
check("41 AUTH-001: 02.07.2026, 00:30 българско време → преходният режим е изтекъл", BTC, unlicensed, custody,
  { result: "inconclusive", outcomes: { "AUTH-001": "evidence_required/critical" } }, new Date("2026-07-01T21:30:00Z"));

// ---- Регистър на ESMA ----
const AS_OF = "2026-10-22T10:00:00Z";
const LEI_ORG = "64882N0ABXS71817AI18";
const caspEntry = (over: Partial<NonNullable<NonNullable<RegisterEvidence["casp"]>["entry"]>> = {}) => ({
  lei: LEI_ORG, name: "Belayer OOD", commercial_name: "Belayer", authority: "Комисия за финансов надзор", home_member_state: "BG",
  legal_basis: "art63" as const, services: ["custody", "execution", "portfolio"] as any, authorised_on: "2026-04-28", ended_on: null, ...over,
});
const regCasp = (entry: any): RegisterEvidence => ({ casp: { as_of: AS_OF, lei: LEI_ORG, entry } });
const withLei: OrgFacts = { ...casp, lei: LEI_ORG };
const noLicenceLei: OrgFacts = { ...unlicensed, lei: LEI_ORG };

check("42 Регистър: лицензът и услугата са вписани", BTC, withLei, { activities: ["custody"] },
  { result: "compliant", risk: 0, outcomes: { "AUTH-001": "pass", "AUTH-003": "pass" } }, NOW, regCasp(caspEntry()));
check("43 Регистър: услугата не е вписана (платформа)", BTC, withLei, { activities: ["custody", "trading_platform"], suitability_documented: "yes" },
  { result: "non_compliant", outcomes: { "AUTH-001": "pass", "AUTH-003": "fail/high" } }, NOW, regCasp(caspEntry()));
check("44 Регистър: лицензът е прекратен", BTC, withLei, { activities: ["custody"] },
  { result: "non_compliant", outcomes: { "AUTH-001": "fail/critical" }, absent: ["AUTH-003"] }, NOW, regCasp(caspEntry({ ended_on: "2026-09-30" })));
check("45 Регистър: прекратяване в бъдеще — още действа", BTC, withLei, { activities: ["custody"] },
  { result: "compliant", outcomes: { "AUTH-001": "pass", "AUTH-003": "pass" } }, NOW, regCasp(caspEntry({ ended_on: "2026-12-31" })));
check("46 Регистър: не е открит, деклариран номер", BTC, withLei, { activities: ["custody"] },
  { result: "inconclusive", outcomes: { "AUTH-001": "evidence_required/high" }, absent: ["AUTH-003"] }, NOW, regCasp(null));
check("47 Регистър: не е открит, без номер, след 01.07.2026", BTC, noLicenceLei, { activities: ["custody"] },
  { result: "inconclusive", outcomes: { "AUTH-001": "evidence_required/critical" } }, NOW, regCasp(null));
check("48 Регистър: няма данни за услугите", BTC, withLei, { activities: ["custody"] },
  { result: "partially_compliant", outcomes: { "AUTH-001": "pass", "AUTH-003": "evidence_required/medium" } }, NOW, regCasp(caspEntry({ services: [] })));
check("49 Регистър: вписан, без деклариран номер — регистърът стига", BTC, noLicenceLei, { activities: ["custody"] },
  { result: "compliant", outcomes: { "AUTH-001": "pass" } }, NOW, regCasp(caspEntry()));

const CIRCLE_LEI = "969500OYUDADGZKCR583";
const circleEntry = (over: any = {}) => ({
  lei: CIRCLE_LEI, name: "Circle Internet Financial Europe SAS", authority: "ACPR", home_member_state: "FR", authorisation: "emi" as const,
  authorised_on: "2024-07-01", ended_on: null,
  whitepapers: [{ url: "https://www.circle.com/fr/legal/mica-usdc-whitepaper", notified_on: "2024-07-01", last_update: "2026-09-15" }], ...over,
});
const regIssuer = (entry: any, register: "emt" | "art" = "emt"): RegisterEvidence => ({
  issuer: { as_of: AS_OF, lei: CIRCLE_LEI, register, entry, whitepaper: entry?.whitepapers?.[0] ?? null },
});
const USDC_LEI: AssetFacts = { ...USDC, issuer_lei: CIRCLE_LEI };

{
  const r = runMicaRules(USDC_LEI, casp, { activities: ["custody", "exchange_funds"] }, NOW, regIssuer(circleEntry()));
  const e1 = r.findings.find((f) => f.rule_code === "EMT-001")!;
  const e2 = r.findings.find((f) => f.rule_code === "EMT-002")!;
  const ok = e1.outcome === "pass" && e1.evidence.source === "esma_register" && e2.outcome === "pass" && e2.evidence.source === "esma_register"
    && e2.details.includes("mica-usdc-whitepaper") && e2.details.includes("01.07.2024") && e2.details.includes("регистър на ESMA към 22.10.2026");
  if (ok) { passed++; console.log("✓ 50 USDC: емитентът и бялата книга — от регистъра на ESMA"); }
  else { failed++; console.log("✗ 50 USDC от регистъра\n    " + e1.outcome + " " + e1.evidence.source + " | " + e2.details); }
}
check("51 EMT: каталогът казва ИЕП, регистърът не го потвърждава", USDC_LEI, casp, { activities: ["custody"] },
  { result: "inconclusive", outcomes: { "EMT-001": "evidence_required/high" } }, NOW, regIssuer(null));
check("52 EMT: записът на емитента е прекратен", USDC_LEI, casp, { activities: ["custody"] },
  { result: "non_compliant", outcomes: { "EMT-001": "fail/critical", "STB-001": "fail/critical" } }, NOW, regIssuer(circleEntry({ ended_on: "2026-08-01" })));
check("53 EMT: регистърът има предимство пред остарял каталог", { ...USDT, issuer_lei: CIRCLE_LEI }, casp, { activities: ["custody"] },
  { result: "compliant", outcomes: { "EMT-001": "pass" }, absent: ["STB-001"] }, NOW, regIssuer(circleEntry()));
check("54 EMT: USDT — каталог „без лиценз“, не е в регистъра", { ...USDT, issuer_lei: CIRCLE_LEI }, casp, { activities: ["custody"] },
  { result: "non_compliant", outcomes: { "EMT-001": "fail/critical", "STB-001": "fail/critical" } }, NOW, regIssuer(null));
check("55 EMT: регистър на ART не се ползва за EMT", USDC_LEI, casp, { activities: ["custody"] },
  { result: "compliant", outcomes: { "EMT-001": "pass" } }, NOW, regIssuer(null, "art"));

console.log(`\n${passed} успешни, ${failed} неуспешни`);
if (failed > 0) process.exit(1);
