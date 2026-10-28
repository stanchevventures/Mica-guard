// =====================================================================
// Стейбълкойн чекър: кои известни стейбълкойни имат емитент и бяла книга
// в регистъра на ESMA (EMT/ART).
//
// Регистърът няма колона със символа на токена, затова тук стои ръчно
// поддържан списък: токен -> емитент (LEI). Статусът НЕ се пише ръчно —
// изчислява се всеки път от актуалния регистър в базата.
//
// Само импорти на типове: модулът се ползва и от Next.js, и от тестовете
// (node --experimental-strip-types). Функциите от register.ts се подават отвън.
// =====================================================================

import type { RegisterIssuerEntry } from "./register";

export type StablecoinDef = {
  symbol: string;
  name: string;
  /** Валутата, към която е обвързан */
  currency: string;
  /** Емитентът, както е известен публично */
  issuer: string;
  /** LEI на емитента в ЕС; null — емитентът няма дружество, вписано в регистъра на ESMA */
  issuerLei: string | null;
  /** Части от името за търсене в регистъра, ако issuerLei е null */
  issuerSearch?: string[];
  /** Ключова дума в линка на бялата книга (когато емитентът има няколко бели книги) */
  whitepaperKey?: string;
};

// LEI-тата са сверени с регистъра на ESMA (EMTWP.csv, 22.10.2026) — виж tests/stablecoins.test.mts.
export const STABLECOINS: StablecoinDef[] = [
  { symbol: "USDT", name: "Tether USD", currency: "USD", issuer: "Tether", issuerLei: null, issuerSearch: ["tether"] },
  { symbol: "USDC", name: "USD Coin", currency: "USD", issuer: "Circle Internet Financial Europe SAS", issuerLei: "969500OYUDADGZKCR583", whitepaperKey: "usdc" },
  { symbol: "EURC", name: "Euro Coin", currency: "EUR", issuer: "Circle Internet Financial Europe SAS", issuerLei: "969500OYUDADGZKCR583", whitepaperKey: "eurc" },
  { symbol: "FDUSD", name: "First Digital USD", currency: "USD", issuer: "First Digital Labs", issuerLei: null, issuerSearch: ["first digital"] },
  { symbol: "TUSD", name: "TrueUSD", currency: "USD", issuer: "Techteryx", issuerLei: null, issuerSearch: ["techteryx", "trueusd"] },
  { symbol: "USDG", name: "Global Dollar", currency: "USD", issuer: "Paxos Issuance Europe Oy", issuerLei: "743700KYSSTKZYGEUF50", whitepaperKey: "usdg" },
  { symbol: "EUROe", name: "EUROe", currency: "EUR", issuer: "Paxos Issuance Europe Oy", issuerLei: "743700KYSSTKZYGEUF50", whitepaperKey: "euroe" },
  { symbol: "EURCV", name: "EUR CoinVertible", currency: "EUR", issuer: "Société Générale – Forge", issuerLei: "969500FX8K40ZDW4F377", whitepaperKey: "eurcv" },
  { symbol: "USDCV", name: "USD CoinVertible", currency: "USD", issuer: "Société Générale – Forge", issuerLei: "969500FX8K40ZDW4F377", whitepaperKey: "usdcv" },
  { symbol: "EURe", name: "Monerium EUR", currency: "EUR", issuer: "Monerium ehf", issuerLei: "2549003QDNZWASSSCY31" },
  { symbol: "EURQ", name: "Quantoz EURQ", currency: "EUR", issuer: "Quantoz Payments B.V.", issuerLei: "7245008P1HPUPVM7XL94" },
  { symbol: "USDQ", name: "Quantoz USDQ", currency: "USD", issuer: "Quantoz Payments B.V.", issuerLei: "7245008P1HPUPVM7XL94" },
  { symbol: "EURI", name: "Eurite", currency: "EUR", issuer: "Banking Circle S.A.", issuerLei: "213800W1NGBLERUS6M39" },
  { symbol: "EUROP", name: "EUROP", currency: "EUR", issuer: "Schuman Financial (SALVUS)", issuerLei: "969500SGAEBRXYUAJ739" },
  { symbol: "EURAU", name: "AllUnity EUR", currency: "EUR", issuer: "AllUnity GmbH", issuerLei: "3912007G8L8CD3HFIV26" },
];

/**
 * authorised — емитентът е вписан и е открита бялата книга на токена
 * check      — има запис, но не е ясно дали покрива този токен (провери ръчно)
 * ended      — записът на емитента е прекратен
 * not_found  — нито емитентът, нито бялата книга са в регистъра
 */
export type StablecoinStatus = "authorised" | "check" | "ended" | "not_found";

export type StablecoinResult = {
  symbol: string;
  name: string;
  currency: string;
  issuer: string;
  status: StablecoinStatus;
  /** Записът от регистъра (ако има) */
  register: {
    lei: string;
    name: string;
    authority: string | null;
    country: string | null;
    authorisation: RegisterIssuerEntry["authorisation"];
    ended_on: string | null;
    whitepaper_url: string | null;
    whitepaper_date: string | null;
  } | null;
};

type Pick = (entry: RegisterIssuerEntry, symbol: string) => RegisterIssuerEntry["whitepapers"][number] | null;

function matchesSearch(entry: RegisterIssuerEntry, terms: string[]): boolean {
  const name = entry.name.toLowerCase();
  return terms.some((t) => name.includes(t.toLowerCase()));
}

/** Статусът на един стейбълкойн спрямо записите на емитентите в регистъра (EMT + ART) */
export function evaluateStablecoin(def: StablecoinDef, issuers: RegisterIssuerEntry[], pick: Pick): StablecoinResult {
  const entry = def.issuerLei
    ? (issuers.find((e) => e.lei === def.issuerLei) ?? null)
    : (issuers.find((e) => matchesSearch(e, def.issuerSearch ?? [def.issuer])) ?? null);

  const base = { symbol: def.symbol, name: def.name, currency: def.currency, issuer: def.issuer };
  if (!entry) return { ...base, status: "not_found", register: null };

  const paper = pick(entry, def.whitepaperKey ?? def.symbol);
  const register = {
    lei: entry.lei,
    name: entry.name,
    authority: entry.authority,
    country: entry.home_member_state,
    authorisation: entry.authorisation,
    ended_on: entry.ended_on,
    whitepaper_url: paper?.url && /^https?:\/\//i.test(paper.url) ? paper.url : null,
    whitepaper_date: paper?.notified_on ?? null,
  };

  let status: StablecoinStatus;
  if (entry.ended_on) status = "ended";
  // Емитент без известен LEI, открит само по име — не потвърждаваме автоматично
  else if (!def.issuerLei) status = "check";
  else if (register.whitepaper_url) status = "authorised";
  else status = "check";
  return { ...base, status, register };
}

export function evaluateStablecoins(issuers: RegisterIssuerEntry[], pick: Pick, defs = STABLECOINS): StablecoinResult[] {
  return defs.map((d) => evaluateStablecoin(d, issuers, pick));
}

/** Броят на белите книги в регистъра (без служебните стойности като EMT_NO_WP) */
export function countWhitepapers(issuers: RegisterIssuerEntry[]): number {
  return issuers.reduce((n, e) => n + e.whitepapers.filter((w) => /^https?:\/\//i.test(w.url)).length, 0);
}
