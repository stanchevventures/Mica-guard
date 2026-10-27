import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  CLASSIFICATION_LABEL,
  RESULT_LABEL,
  RESULT_STYLE,
  SEVERITY_LABEL,
  SEVERITY_STYLE,
  STATUS_LABEL,
  formatDate,
} from "@/lib/mica/labels";

type Params = Promise<{ orgSlug: string; checkId: string }>;

type Finding = {
  id: string;
  rule_code: string;
  mica_reference: string | null;
  title: string;
  passed: boolean;
  severity: string;
  details: string | null;
  remediation: string | null;
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

export default function CheckDetailPage({ params }: { params: Params }) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <Suspense fallback={<p className="text-slate-400">Зареждане…</p>}>
        <CheckDetail params={params} />
      </Suspense>
    </main>
  );
}

async function CheckDetail({ params }: { params: Params }) {
  await connection();
  const { orgSlug, checkId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(checkId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: check }, { data: findingsData }] = await Promise.all([
    supabase
      .from("v_check_history")
      .select("id, created_at, status, result, risk_score, classification_result, symbol, asset_name, blockchain, requested_by_name, rule_set_version")
      .eq("id", checkId)
      .maybeSingle(),
    supabase
      .from("check_findings")
      .select("id, rule_code, mica_reference, title, passed, severity, details, remediation")
      .eq("check_id", checkId),
  ]);

  // RLS връща нищо, ако проверката е на чужда организация
  if (!check) notFound();

  const findings = ((findingsData ?? []) as Finding[]).sort((a, b) => {
    if (a.passed !== b.passed) return a.passed ? 1 : -1; // неизпълнените първо
    return SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/dashboard/${orgSlug}/checks`} className="text-sm text-slate-400 hover:text-white">
        ← Към историята
      </Link>

      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {check.symbol} <span className="text-slate-400">— {check.asset_name}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {check.blockchain} · {formatDate(check.created_at)} · {check.requested_by_name ?? "—"}
            </p>
          </div>
          {check.result ? (
            <span className={`rounded-full px-3 py-1.5 text-sm ${RESULT_STYLE[check.result]}`}>
              {RESULT_LABEL[check.result]}
            </span>
          ) : (
            <span className="text-slate-400">{STATUS_LABEL[check.status] ?? check.status}</span>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-400">Рисков резултат</dt>
            <dd className="mt-1 text-xl font-semibold">{check.risk_score ?? "—"}<span className="text-sm text-slate-500"> / 100</span></dd>
          </div>
          <div>
            <dt className="text-slate-400">Класификация</dt>
            <dd className="mt-1 text-xl font-semibold">
              {check.classification_result ? CLASSIFICATION_LABEL[check.classification_result] : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Набор правила</dt>
            <dd className="mt-1 font-mono text-sm">{check.rule_set_version ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <h2 className="mt-8 text-lg font-medium">Констатации</h2>
      <ul className="mt-3 space-y-3">
        {findings.map((f) => (
          <li key={f.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">
                  <span className={f.passed ? "text-emerald-400" : "text-red-400"}>
                    {f.passed ? "✓" : "✗"}
                  </span>{" "}
                  {f.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {f.rule_code} · MiCA {f.mica_reference ?? "—"}
                </p>
              </div>
              {!f.passed && (
                <span className={`text-xs ${SEVERITY_STYLE[f.severity]}`}>
                  {SEVERITY_LABEL[f.severity]}
                </span>
              )}
            </div>
            {f.details && <p className="mt-3 text-sm text-slate-300">{f.details}</p>}
            {f.remediation && (
              <p className="mt-2 text-sm text-amber-300/90">→ {f.remediation}</p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-slate-500">
        Автоматичната оценка е предварителна и не представлява правно становище. Резултатите
        трябва да бъдат прегледани от квалифициран специалист по съответствието.
      </p>
    </div>
  );
}
