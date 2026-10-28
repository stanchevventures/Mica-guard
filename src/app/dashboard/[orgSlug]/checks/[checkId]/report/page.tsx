import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reportFingerprint, type ReportData, type ReportFinding } from "@/lib/mica/report";
import { ReportDocument } from "./report-document";
import { PrintButton } from "./print-button";

type Params = Promise<{ orgSlug: string; checkId: string }>;

type Snapshot = {
  engine_version?: string;
  evaluated_at?: string;
  answers?: Record<string, unknown> & { activities?: string[] };
  asset?: { contract_address?: string | null };
  context?: { activity?: string };
};

export default function ReportPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Зареждане…</p>}>
      <Report params={params} />
    </Suspense>
  );
}

async function Report({ params }: { params: Params }) {
  await connection();
  const { orgSlug, checkId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(checkId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS връща данни само за проверки на организации, в които потребителят членува
  const [{ data: check }, { data: findingsData }, { data: raw }] = await Promise.all([
    supabase
      .from("v_check_history")
      .select(
        "id, created_at, completed_at, status, result, risk_score, classification_result, symbol, asset_name, blockchain, requested_by_name, rule_set_version, failed_findings, evidence_gaps, upcoming_obligations"
      )
      .eq("id", checkId)
      .maybeSingle(),
    supabase
      .from("check_findings")
      .select("id, rule_code, mica_reference, title, outcome, severity, details, remediation, evidence")
      .eq("check_id", checkId),
    supabase
      .from("compliance_checks")
      .select("organization_id, input_snapshot, crypto_assets(contract_address)")
      .eq("id", checkId)
      .maybeSingle(),
  ]);
  if (!check || !raw) notFound();

  const { data: org } = await supabase
    .from("organizations")
    .select("name, entity_type, country_code, lei, nca_name, casp_license_number")
    .eq("id", raw.organization_id)
    .maybeSingle();
  if (!org) notFound();

  const snap = (raw.input_snapshot ?? {}) as Snapshot;
  const assetRow = Array.isArray(raw.crypto_assets) ? raw.crypto_assets[0] : raw.crypto_assets;

  const data: ReportData = {
    check: {
      id: check.id,
      created_at: check.created_at,
      completed_at: check.completed_at,
      status: check.status,
      result: check.result,
      risk_score: check.risk_score === null ? null : Number(check.risk_score),
      classification_result: check.classification_result,
      rule_set_version: check.rule_set_version,
      requested_by_name: check.requested_by_name,
      failed_findings: Number(check.failed_findings ?? 0),
      evidence_gaps: Number(check.evidence_gaps ?? 0),
      upcoming_obligations: Number(check.upcoming_obligations ?? 0),
    },
    organization: {
      name: org.name,
      entity_type: org.entity_type,
      country_code: org.country_code,
      lei: org.lei,
      nca_name: org.nca_name,
      casp_license_number: org.casp_license_number,
    },
    asset: {
      symbol: check.symbol,
      name: check.asset_name,
      blockchain: check.blockchain,
      contract_address: snap.asset?.contract_address ?? assetRow?.contract_address ?? null,
    },
    services: snap.answers?.activities ?? (snap.context?.activity ? [snap.context.activity] : []),
    answers: snap.answers ?? {},
    engine_version: snap.engine_version ?? null,
    evaluated_at: snap.evaluated_at ?? null,
    findings: (findingsData ?? []) as ReportFinding[],
    input_snapshot: raw.input_snapshot ?? {},
  };

  const fingerprint = reportFingerprint(data);
  const generatedAt = new Date().toISOString();

  return (
    <div className="rp-page">
      <div className="rp-toolbar rp-noprint">
        <Link href={`/dashboard/${orgSlug}/checks/${checkId}`}>← Към проверката</Link>
        <span>В прозореца за печат избери „Запази като PDF“.</span>
        <PrintButton />
      </div>
      <ReportDocument data={data} fingerprint={fingerprint} generatedAt={generatedAt} />
    </div>
  );
}
