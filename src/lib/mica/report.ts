// =====================================================================
// Доклад за оценка — данни и контролна сума (SHA-256)
//
// Контролната сума се изчислява от каноничен JSON на проверката,
// констатациите и входните данни. Всяка промяна в тях променя сумата —
// така отпечатан или архивиран доклад може да се сравни с данните в системата.
// =====================================================================
import { createHash } from "crypto";

export const REPORT_FORMAT_VERSION = 1;

export type ReportFinding = {
  id: string;
  rule_code: string;
  mica_reference: string | null;
  title: string;
  outcome: string;
  severity: string;
  details: string | null;
  remediation: string | null;
  evidence: Record<string, unknown> | null;
};

export type ReportData = {
  check: {
    id: string;
    created_at: string;
    completed_at: string | null;
    status: string;
    result: string | null;
    risk_score: number | null;
    classification_result: string | null;
    rule_set_version: string | null;
    requested_by_name: string | null;
    failed_findings: number;
    evidence_gaps: number;
    upcoming_obligations: number;
  };
  organization: {
    name: string;
    entity_type: string;
    country_code: string | null;
    lei: string | null;
    nca_name: string | null;
    casp_license_number: string | null;
  };
  asset: {
    symbol: string;
    name: string;
    blockchain: string;
    contract_address: string | null;
  };
  services: string[];
  answers: Record<string, unknown>;
  engine_version: string | null;
  evaluated_at: string | null;
  findings: ReportFinding[];
  input_snapshot: unknown;
};

/** JSON с подредени ключове — еднакъв резултат при еднакви данни */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(",")}}`;
}

/** Сравнение по кодови точки — не зависи от езиковите настройки на сървъра */
function byCodePoint(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** SHA-256 на съдържанието на доклада (без датата на генериране) */
export function reportFingerprint(data: ReportData): string {
  const payload = {
    format: REPORT_FORMAT_VERSION,
    check: {
      id: data.check.id,
      created_at: data.check.created_at,
      completed_at: data.check.completed_at,
      status: data.check.status,
      result: data.check.result,
      risk_score: data.check.risk_score,
      classification_result: data.check.classification_result,
      rule_set_version: data.check.rule_set_version,
    },
    findings: [...data.findings]
      .sort((a, b) => byCodePoint(a.rule_code, b.rule_code) || byCodePoint(a.id, b.id))
      .map((f) => ({
        rule_code: f.rule_code,
        mica_reference: f.mica_reference,
        title: f.title,
        outcome: f.outcome,
        severity: f.severity,
        details: f.details,
        remediation: f.remediation,
        evidence: f.evidence,
      })),
    input_snapshot: data.input_snapshot,
  };
  return createHash("sha256").update(canonicalJson(payload), "utf8").digest("hex");
}
