// =====================================================================
// Проверка на портфейл: целият списък с токени на клиента наведнъж.
// Чисти функции (без база и без импорти по време на изпълнение) —
// тестват се с node tests/portfolio.test.mts.
// =====================================================================

import type { CheckResult, Classification, EngineOutput, Finding, Outcome, Severity } from "./engine";

/** Максимум токени в една проверка на портфейл */
export const PORTFOLIO_LIMIT = 100;

const SYMBOL_RE = /^[A-Za-z0-9][A-Za-z0-9.\-_$]{0,19}$/;
/** Думи от заглавен ред на CSV/Excel, които не са токени */
const HEADER_WORDS = new Set(["symbol", "symbols", "ticker", "token", "tokens", "asset", "assets", "символ", "токен", "актив"]);

/**
 * Разбира списък, поставен от Excel, CSV или ръчно: символи, разделени с нов ред,
 * запетая, точка и запетая, табулация или интервал. Повторенията се махат (без значение
 * на малки/главни букви), редът се запазва.
 */
export function parseSymbols(text: string): { symbols: string[]; invalid: string[]; truncated: boolean } {
  const seen = new Set<string>();
  const symbols: string[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const t = raw.trim().replace(/^["']|["']$/g, "");
    if (!t || HEADER_WORDS.has(t.toLowerCase())) continue;
    if (!SYMBOL_RE.test(t)) {
      if (!invalid.includes(t)) invalid.push(t);
      continue;
    }
    const key = t.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    symbols.push(t);
  }
  return { symbols: symbols.slice(0, PORTFOLIO_LIMIT), invalid, truncated: symbols.length > PORTFOLIO_LIMIT };
}

export type CatalogAsset = { id: string; symbol: string; blockchain: string; contract_address: string | null };

/**
 * Свързва символите с каталога. Ако един символ има няколко записа (различни вериги),
 * взима първия по реда на каталога — стейбълкойните са записани веднъж за всички вериги.
 */
export function matchSymbols<T extends CatalogAsset>(symbols: string[], catalog: T[]): { matched: T[]; unknown: string[] } {
  const bySymbol = new Map<string, T>();
  for (const a of catalog) {
    const key = a.symbol.toUpperCase();
    if (!bySymbol.has(key)) bySymbol.set(key, a);
  }
  const matched: T[] = [];
  const unknown: string[] = [];
  for (const s of symbols) {
    const a = bySymbol.get(s.toUpperCase());
    if (a) matched.push(a);
    else unknown.push(s);
  }
  return { matched, unknown };
}

export type PortfolioRow = {
  asset_id: string;
  symbol: string;
  name: string;
  blockchain: string;
  classification: Classification;
  result: CheckResult;
  risk_score: number;
  counts: EngineOutput["counts"];
  /** Най-важната констатация за самия токен (нарушение, после липсващи данни, после предстоящ срок) */
  top: PortfolioFinding | null;
};

export type PortfolioFinding = {
  rule_code: string;
  mica_reference: string;
  title: string;
  outcome: Outcome;
  severity: Severity;
  remediation: string | null;
};

const OUTCOME_RANK: Partial<Record<Outcome, number>> = { fail: 0, evidence_required: 1, upcoming: 2 };
const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

/** Лицензът на организацията (AUTH-*) е еднакъв за всички токени — показва се веднъж над таблицата */
export const isOrgLevel = (code: string) => code.startsWith("AUTH-");

/**
 * За ред от таблицата: първо констатациите за самия токен, после тези за лиценза.
 * При равни — изходът, тежестта и накрая STB-001 (какво да направи доставчикът със стейбълкойна).
 */
function rank(f: Finding): number[] {
  return [
    isOrgLevel(f.rule_code) ? 1 : 0,
    OUTCOME_RANK[f.outcome] ?? 9,
    SEVERITY_RANK[f.severity],
    f.rule_code === "STB-001" ? 0 : 1,
  ];
}

function compare(a: Finding, b: Finding): number {
  const ra = rank(a), rb = rank(b);
  for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
  return 0;
}

function pick(f: Finding): PortfolioFinding {
  return { rule_code: f.rule_code, mica_reference: f.mica_reference, title: f.title, outcome: f.outcome, severity: f.severity, remediation: f.remediation };
}

export function topFinding(findings: Finding[]): PortfolioRow["top"] {
  const issues = findings.filter((f) => f.outcome in OUTCOME_RANK).sort(compare);
  return issues[0] ? pick(issues[0]) : null;
}

/** Пропуските в лиценза на организацията от всички редове — без повторения */
export function orgFindings(perAsset: Finding[][]): PortfolioFinding[] {
  const seen = new Map<string, Finding>();
  for (const findings of perAsset) {
    for (const f of findings) {
      if (!isOrgLevel(f.rule_code) || !(f.outcome === "fail" || f.outcome === "evidence_required")) continue;
      const prev = seen.get(f.rule_code);
      if (!prev || compare(f, prev) < 0) seen.set(f.rule_code, f);
    }
  }
  return [...seen.values()].sort(compare).map(pick);
}

const RESULT_RANK: Record<CheckResult, number> = { non_compliant: 0, inconclusive: 1, partially_compliant: 2, compliant: 3 };

/** Най-рисковите токени първи */
export function sortRows(rows: PortfolioRow[]): PortfolioRow[] {
  return [...rows].sort(
    (a, b) => RESULT_RANK[a.result] - RESULT_RANK[b.result] || b.risk_score - a.risk_score || a.symbol.localeCompare(b.symbol)
  );
}

export function summarizePortfolio(rows: PortfolioRow[]): Record<CheckResult, number> {
  const out: Record<CheckResult, number> = { non_compliant: 0, inconclusive: 0, partially_compliant: 0, compliant: 0 };
  for (const r of rows) out[r.result]++;
  return out;
}

function csvCell(v: string | number): string {
  const s = String(v);
  // Защита от формули при отваряне в Excel (CSV injection)
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV за Excel: с BOM (кирилица) и „;“ — разделителят на Excel при български регионални настройки */
export function portfolioCsv(
  rows: PortfolioRow[],
  labels: { result: Record<string, string>; classification: Record<string, string>; outcome: Record<string, string> }
): string {
  const header = ["Символ", "Име", "Верига", "Класификация", "Резултат", "Риск", "Нарушения", "Нужни данни", "Предстоящи", "Основна констатация", "Член", "Препоръка"];
  const lines = rows.map((r) =>
    [
      r.symbol,
      r.name,
      r.blockchain,
      labels.classification[r.classification] ?? r.classification,
      labels.result[r.result] ?? r.result,
      r.risk_score,
      r.counts.fail,
      r.counts.evidence_required,
      r.counts.upcoming,
      r.top ? `${labels.outcome[r.top.outcome] ?? r.top.outcome}: ${r.top.title}` : "",
      r.top?.mica_reference ?? "",
      r.top?.remediation ?? "",
    ]
      .map(csvCell)
      .join(";")
  );
  return "﻿" + [header.join(";"), ...lines].join("\r\n");
}
