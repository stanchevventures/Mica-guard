// Тестове на стейбълкойн чекъра. Пускане: node tests/stablecoins.test.mts
import { buildIssuerEntry, isValidLei, pickWhitepaper } from "../src/lib/esma/register.ts";
import { countWhitepapers, evaluateStablecoin, evaluateStablecoins, STABLECOINS } from "../src/lib/esma/stablecoins.ts";

let passed = 0, failed = 0;
function eq(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`✓ ${name}`); }
  else { failed++; console.log(`✗ ${name}\n    получено: ${a}\n    очаквано: ${e}`); }
}

const TODAY = "2026-10-28";
const row = (lei: string, name: string, url: string, date: string, end: string | null = null) => ({
  lei, lei_name: name, commercial_name: null, home_member_state: "FR", competent_authority: "ACPR",
  legal_basis: null, services: [], issuer_authorisation: "emi" as const, authorisation_date: "2024-07-01",
  authorisation_end_date: end, whitepaper_url: url, whitepaper_date: date, last_update: date,
});

const CIRCLE = "969500OYUDADGZKCR583";
const PAXOS = "743700KYSSTKZYGEUF50";
const issuers = [
  buildIssuerEntry([
    row(CIRCLE, "Circle Internet Financial Europe SAS", "https://www.circle.com/fr/legal/mica-eurc-whitepaper", "2024-07-01"),
    row(CIRCLE, "Circle Internet Financial Europe SAS", "https://www.circle.com/fr/legal/mica-usdc-whitepaper", "2024-07-01"),
  ], TODAY)!,
  buildIssuerEntry([
    row(PAXOS, "Paxos Issuance Europe Oy", "https://www.membrane.fi/whitepapers/EUROe.html", "2024-06-29"),
    row(PAXOS, "Paxos Issuance Europe Oy", "https://www.membrane.fi/whitepapers/eUSD.html", "2024-06-29"),
    row(PAXOS, "Paxos Issuance Europe Oy", "https://www.paxos.com/white-paper", "2025-06-09"),
  ], TODAY)!,
  buildIssuerEntry([row("2594008EL5UN8RIA8P23", "StaBillon sp. z o.o.", "EMT_NO_WP", "2026-01-01")], TODAY)!,
];
const def = (symbol: string) => STABLECOINS.find((d) => d.symbol === symbol)!;

// ---- Списъкът ----
eq("Всички LEI в списъка са валидни (ISO 17442)", STABLECOINS.filter((d) => d.issuerLei && !isValidLei(d.issuerLei)).map((d) => d.symbol), []);
eq("Няма повтарящи се символи", new Set(STABLECOINS.map((d) => d.symbol.toUpperCase())).size, STABLECOINS.length);
eq("Без LEI -> има по какво да се търси по име", STABLECOINS.filter((d) => !d.issuerLei && !(d.issuerSearch?.length)).length, 0);

// ---- Статуси ----
const usdc = evaluateStablecoin(def("USDC"), issuers, pickWhitepaper);
eq("USDC -> вписан", usdc.status, "authorised");
eq("USDC -> собствената бяла книга, не тази на EURC", usdc.register?.whitepaper_url, "https://www.circle.com/fr/legal/mica-usdc-whitepaper");
eq("EURC -> бялата книга на EURC", evaluateStablecoin(def("EURC"), issuers, pickWhitepaper).register?.whitepaper_url, "https://www.circle.com/fr/legal/mica-eurc-whitepaper");
eq("EUROe -> бяла книга по символа в линка", evaluateStablecoin(def("EUROe"), issuers, pickWhitepaper).register?.whitepaper_url, "https://www.membrane.fi/whitepapers/EUROe.html");
eq("USDG -> емитентът е вписан, но бялата книга не е открита -> провери", evaluateStablecoin(def("USDG"), issuers, pickWhitepaper).status, "check");
eq("USDT -> не е в регистъра", evaluateStablecoin(def("USDT"), issuers, pickWhitepaper).status, "not_found");
eq("USDT -> без данни от регистъра", evaluateStablecoin(def("USDT"), issuers, pickWhitepaper).register, null);
eq("Емитент, който не е зареден -> не е в регистъра", evaluateStablecoin(def("EURCV"), issuers, pickWhitepaper).status, "not_found");

// Ако емитент без известен LEI се появи в регистъра — не го потвърждаваме сами, а казваме „провери“
const withTether = [...issuers, buildIssuerEntry([row("5493001KJTIIGC8Y1R12", "Tether Europe B.V.", "https://tether.example/wp", "2026-11-01")], TODAY)!];
eq("Нов запис на Tether -> провери", evaluateStablecoin(def("USDT"), withTether, pickWhitepaper).status, "check");

// Прекратен запис
const ended = [buildIssuerEntry([row(CIRCLE, "Circle Internet Financial Europe SAS", "https://www.circle.com/fr/legal/mica-usdc-whitepaper", "2024-07-01", "2026-09-30")], TODAY)!];
const usdcEnded = evaluateStablecoin(def("USDC"), ended, pickWhitepaper);
eq("Прекратен лиценз -> прекратен", usdcEnded.status, "ended");
eq("Прекратен лиценз -> дата", usdcEnded.register?.ended_on, "2026-09-30");

// Служебна стойност вместо линк не се показва като бяла книга
eq("EMT_NO_WP не се брои за бяла книга", countWhitepapers(issuers), 5);
eq("Резултат за всеки токен от списъка", evaluateStablecoins(issuers, pickWhitepaper).length, STABLECOINS.length);
eq("Празен регистър -> всички „не е в регистъра“", [...new Set(evaluateStablecoins([], pickWhitepaper).map((r) => r.status))], ["not_found"]);

console.log(`\n${passed} успешни, ${failed} неуспешни`);
if (failed > 0) process.exit(1);
