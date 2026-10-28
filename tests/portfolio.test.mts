// Тестове на проверката на портфейл. Пускане: node tests/portfolio.test.mts
import { runMicaRules, type AssetFacts, type OrgFacts } from "../src/lib/mica/engine.ts";
import {
  isOrgLevel,
  matchSymbols,
  orgFindings,
  parseSymbols,
  portfolioCsv,
  PORTFOLIO_LIMIT,
  sortRows,
  summarizePortfolio,
  topFinding,
  type PortfolioRow,
} from "../src/lib/mica/portfolio.ts";

let passed = 0, failed = 0;
function eq(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`✓ ${name}`); }
  else { failed++; console.log(`✗ ${name}\n    получено: ${a}\n    очаквано: ${e}`); }
}

// ---- Разчитане на списъка ----
eq("Запетаи и интервали", parseSymbols("BTC, ETH  USDT").symbols, ["BTC", "ETH", "USDT"]);
eq("Колона от Excel (нови редове, табулации, CRLF)", parseSymbols("Symbol\r\nBTC\t\r\nETH\r\n").symbols, ["BTC", "ETH"]);
eq("Точка и запетая и кавички", parseSymbols('"BTC";"ETH"').symbols, ["BTC", "ETH"]);
eq("Повторения без значение на регистъра", parseSymbols("usdc USDC Usdc eth").symbols, ["usdc", "eth"]);
eq("Заглавен ред на български", parseSymbols("Токен\nBTC").symbols, ["BTC"]);
eq("Невалидни символи се връщат отделно", parseSymbols("BTC <script> ETH").invalid, ["<script>"]);
eq("Празен текст", parseSymbols("  \n ").symbols, []);
const many = Array.from({ length: PORTFOLIO_LIMIT + 5 }, (_, i) => `T${i}`).join(" ");
eq("Над лимита -> отрязва и казва", [parseSymbols(many).symbols.length, parseSymbols(many).truncated], [PORTFOLIO_LIMIT, true]);

// ---- Свързване с каталога ----
const catalog = [
  { id: "1", symbol: "USDC", blockchain: "ethereum", contract_address: "0xa0b8" },
  { id: "2", symbol: "USDC", blockchain: "solana", contract_address: "EPjF" },
  { id: "3", symbol: "EURe", blockchain: "multichain", contract_address: null },
  { id: "4", symbol: "BTC", blockchain: "bitcoin", contract_address: null },
];
const m = matchSymbols(["usdc", "EURE", "btc", "PEPE"], catalog);
eq("Символите се свързват без значение на регистъра", m.matched.map((a) => a.id), ["1", "3", "4"]);
eq("При няколко вериги — първият запис от каталога", m.matched[0].blockchain, "ethereum");
eq("Непознатите се връщат", m.unknown, ["PEPE"]);

// ---- С истинския двигател ----
const NOW = new Date("2026-10-28T10:00:00Z");
const org: OrgFacts = { entity_type: "casp", casp_license_number: "К-123", lei: null };
const usdt: AssetFacts = {
  symbol: "USDT", name: "Tether USD", classification: "emt", identifiable_issuer: true, issuer_name: "Tether",
  issuer_authorisation: "none", anonymisation_function: false, whitepaper_url: null, whitepaper_notified_at: null,
  is_significant: false, issuer_lei: null,
};
const outUsdt = runMicaRules(usdt, org, { activities: ["custody", "exchange_funds"] }, NOW, {});
const top = topFinding(outUsdt.findings);
eq("USDT -> не съответства", outUsdt.result, "non_compliant");
eq("USDT -> основната констатация е нарушение", top?.outcome, "fail");
eq("USDT -> критична", top?.severity, "critical");

const btc: AssetFacts = { ...usdt, symbol: "BTC", name: "Bitcoin", classification: "other_crypto_asset", identifiable_issuer: false, issuer_name: null, issuer_authorisation: null };
const outBtc = runMicaRules(btc, org, { activities: ["custody"] }, NOW, {});
eq("Нарушенията са преди липсващите данни", topFinding([
  { ...outUsdt.findings[0], outcome: "evidence_required", severity: "critical" },
  { ...outUsdt.findings[0], outcome: "fail", severity: "low", rule_code: "X" },
])?.rule_code, "X");
eq("Без проблеми -> няма основна констатация", topFinding(outBtc.findings.filter((f) => f.outcome === "pass")), null);
eq("USDT при доставчик -> основната е STB-001 (какво да направи с позициите)", top?.rule_code, "STB-001");

// Лицензът на организацията е еднакъв за всички токени -> отделно, не в реда
const noLicence: OrgFacts = { entity_type: "casp", casp_license_number: null, lei: null };
const outNoLic = runMicaRules(btc, noLicence, { activities: ["custody"] }, NOW, {});
const outNoLicUsdt = runMicaRules(usdt, noLicence, { activities: ["custody"] }, NOW, {});
eq("Без лиценз: в реда на USDT остава констатация за токена", isOrgLevel(topFinding(outNoLicUsdt.findings)!.rule_code), false);
eq("Без лиценз: ако токенът е наред, редът показва лиценза", isOrgLevel(topFinding(outNoLic.findings)?.rule_code ?? "AUTH-"), true);
const org1 = orgFindings([outNoLic.findings, outNoLicUsdt.findings]);
eq("Пропуските в лиценза — веднъж, без повторения", org1.map((f) => f.rule_code), [...new Set(org1.map((f) => f.rule_code))]);
eq("Пропуските в лиценза — само AUTH-*", org1.every((f) => isOrgLevel(f.rule_code)) && org1.length > 0, true);
eq("С лиценз и без проблеми — няма пропуски в лиценза", orgFindings([outUsdt.findings.filter((f) => !isOrgLevel(f.rule_code))]), []);

// ---- Подредба, обобщение, CSV ----
const row = (symbol: string, result: PortfolioRow["result"], risk: number): PortfolioRow => ({
  asset_id: symbol, symbol, name: symbol, blockchain: "x", classification: "emt", result, risk_score: risk,
  counts: { fail: 0, evidence_required: 0, upcoming: 0 }, top: null,
});
const rows = [row("A", "compliant", 0), row("B", "non_compliant", 80), row("C", "inconclusive", 55), row("D", "non_compliant", 95)];
eq("Най-рисковите първи", sortRows(rows).map((r) => r.symbol), ["D", "B", "C", "A"]);
eq("Обобщение", summarizePortfolio(rows), { non_compliant: 2, inconclusive: 1, partially_compliant: 0, compliant: 1 });

const csv = portfolioCsv(
  [{ ...row("=HYPERLINK(\"x\")", "non_compliant", 80), top: { rule_code: "STB-001", mica_reference: "чл. 66(1)", title: "Услуги, с \"кавички\"", outcome: "fail", severity: "critical", remediation: "Спри" } }],
  { result: { non_compliant: "Не съответства" }, classification: { emt: "EMT" }, outcome: { fail: "Нарушение" } }
);
eq("CSV започва с BOM (кирилица в Excel)", csv.charCodeAt(0), 0xfeff);
eq("CSV: формула се неутрализира", csv.includes(`"'=HYPERLINK(""x"")"`), true);
eq("CSV: кавички и запетаи се ескейпват", csv.includes(`"Нарушение: Услуги, с ""кавички"""`), true);
eq("CSV: заглавие + 1 ред", csv.split("\r\n").length, 2);
eq("CSV: разделител „;“ (Excel с български настройки)", csv.split("\r\n")[0].split(";").length, 12);

console.log(`\n${passed} успешни, ${failed} неуспешни`);
if (failed > 0) process.exit(1);
