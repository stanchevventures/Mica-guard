import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVITY_LABEL,
  ADMISSION_LABEL,
  CLASSIFICATION_LABEL,
  OUTCOME_ICON,
  OUTCOME_LABEL,
  OUTCOME_ORDER,
  OUTCOME_STYLE,
  RESULT_HINT,
  RESULT_LABEL,
  RESULT_STYLE,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
  SEVERITY_STYLE,
  SOURCE_LABEL,
  STATUS_LABEL,
  TRI_LABEL,
  formatDate,
} from "@/lib/mica/labels";

type Params = Promise<{ orgSlug: string; checkId: string }>;

type FindingRow = {
  id: string;
  rule_code: string;
  mica_reference: string | null;
  title: string;
  outcome: string;
  severity: string;
  details: string | null;
  remediation: string | null;
  evidence: { source?: string } | null;
};

type Snapshot = {
  engine_version?: string;
  evaluated_at?: string;
  answers?: Record<string, unknown> & { activities?: string[] };
  org?: { casp_license_number?: string | null };
  // по-стари версии
  context?: { activity?: string };
};

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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(checkId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: check }, { data: findingsData }, { data: raw }] = await Promise.all([
    supabase
      .from("v_check_history")
      .select(
        "id, created_at, status, result, risk_score, classification_result, symbol, asset_name, blockchain, requested_by_name, rule_set_version, failed_findings, evidence_gaps, upcoming_obligations"
      )
      .eq("id", checkId)
      .maybeSingle(),
    supabase
      .from("check_findings")
      .select("id, rule_code, mica_reference, title, outcome, severity, details, remediation, evidence")
      .eq("check_id", checkId),
    supabase.from("compliance_checks").select("input_snapshot, error_message").eq("id", checkId).maybeSingle(),
  ]);

  // RLS не връща нищо за проверки на чужда организация
  if (!check) notFound();

  const findings = ((findingsData ?? []) as FindingRow[]).sort(
    (a, b) =>
      OUTCOME_ORDER.indexOf(a.outcome) - OUTCOME_ORDER.indexOf(b.outcome) ||
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  const snap = (raw?.input_snapshot ?? {}) as Snapshot;
  const services: string[] =
    snap.answers?.activities ?? (snap.context?.activity ? [snap.context.activity] : []);
  const answers = snap.answers ?? {};
  const risk = check.risk_score === null ? null : Number(check.risk_score);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/dashboard/${orgSlug}/checks`} className="text-sm text-slate-400 hover:text-white">
          ← Към историята
        </Link>
        {check.status === "completed" && (
          <Link
            href={`/dashboard/${orgSlug}/checks/${checkId}/report`}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Доклад за печат / PDF
          </Link>
        )}
      </div>

      {/* ---------------- Обобщение ---------------- */}
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
            <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${RESULT_STYLE[check.result]}`}>
              {RESULT_LABEL[check.result]}
            </span>
          ) : (
            <span className="text-slate-400">{STATUS_LABEL[check.status] ?? check.status}</span>
          )}
        </div>

        {check.result && <p className="mt-3 text-sm text-slate-400">{RESULT_HINT[check.result]}</p>}
        {check.status === "failed" && raw?.error_message && (
          <p className="mt-3 text-sm text-red-400">Грешка при изпълнение. Пусни проверката отново.</p>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-slate-400">Рисков резултат</dt>
            <dd className="mt-1 text-xl font-semibold">
              {risk ?? "—"}
              <span className="text-sm text-slate-500"> / 100</span>
            </dd>
            {risk !== null && (
              <div className="mt-2 h-1.5 w-full rounded bg-slate-800">
                <div
                  className={`h-1.5 rounded ${risk >= 80 ? "bg-red-500" : risk >= 50 ? "bg-orange-500" : risk >= 25 ? "bg-amber-400" : "bg-emerald-500"}`}
                  style={{ width: `${Math.max(2, risk)}%` }}
                />
              </div>
            )}
          </div>
          <Stat label="Нарушения" value={check.failed_findings} tone="text-red-300" />
          <Stat label="Нужни данни" value={check.evidence_gaps} tone="text-amber-300" />
          <Stat label="Предстоящи" value={check.upcoming_obligations} tone="text-sky-300" />
        </dl>

        <dl className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-800 pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Класификация</dt>
            <dd className="mt-0.5">
              {check.classification_result ? CLASSIFICATION_LABEL[check.classification_result] : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Набор правила</dt>
            <dd className="mt-0.5 font-mono text-xs">{check.rule_set_version ?? "—"}</dd>
          </div>
          {services.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-slate-400">Услуги</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {services.map((s) => (
                  <span key={s} className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-200">
                    {ACTIVITY_LABEL[s] ?? s}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* ---------------- Констатации ---------------- */}
      <h2 className="mt-8 text-lg font-medium">Констатации</h2>
      <ul className="mt-3 space-y-3">
        {findings.map((f) => {
          const issue = f.outcome === "fail" || f.outcome === "evidence_required" || f.outcome === "upcoming";
          return (
            <li key={f.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{f.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {f.rule_code} · MiCA {f.mica_reference ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {issue && (
                    <span className={`text-xs ${SEVERITY_STYLE[f.severity]}`}>{SEVERITY_LABEL[f.severity]}</span>
                  )}
                  <span className={`rounded-full px-2.5 py-1 text-xs ${OUTCOME_STYLE[f.outcome] ?? ""}`}>
                    {OUTCOME_ICON[f.outcome]} {OUTCOME_LABEL[f.outcome] ?? f.outcome}
                  </span>
                </div>
              </div>
              {f.details && <p className="mt-3 text-sm text-slate-300">{f.details}</p>}
              {f.remediation && <p className="mt-2 text-sm text-amber-200/90">→ {f.remediation}</p>}
              {f.evidence?.source && (
                <p className="mt-2 text-xs text-slate-500">Източник: {SOURCE_LABEL[f.evidence.source] ?? f.evidence.source}</p>
              )}
            </li>
          );
        })}
      </ul>

      {/* ---------------- Входни данни ---------------- */}
      {snap.answers && (
        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-medium">Входни данни</h2>
          <p className="mt-1 text-xs text-slate-500">
            Данните, на които се основава оценката, към {formatDate(snap.evaluated_at ?? check.created_at)}.
          </p>
          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Input label="Лиценз / нотификация" value={snap.org?.casp_license_number || "не е въведен"} />
            <TriInput label="Идентифицируем емитент" value={answers.identifiable_issuer} />
            {typeof answers.admission === "string" && (
              <Input label="Допускане до търговия" value={ADMISSION_LABEL[answers.admission] ?? answers.admission} />
            )}
            <TriInput label="Бяла книга (декларация)" value={answers.whitepaper} />
            {typeof answers.whitepaper_url === "string" && /^https?:\/\//i.test(answers.whitepaper_url) && (
              <div className="sm:col-span-2">
                <dt className="text-slate-400">Линк към бялата книга</dt>
                <dd className="mt-0.5 break-all">
                  <a href={answers.whitepaper_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                    {answers.whitepaper_url}
                  </a>
                </dd>
              </div>
            )}
            {typeof answers.whitepaper_notified_at === "string" && (
              <Input label="Дата на нотифициране" value={answers.whitepaper_notified_at} />
            )}
            <TriInput label="Писмено съгласие от емитента" value={answers.issuer_consent} />
            <TriInput label="Документирана оценка на пригодността" value={answers.suitability_documented} />
            <TriInput label="Идентифициране на притежателите" value={answers.holders_identifiable} />
          </dl>
        </section>
      )}

      {/* ---------------- Методология ---------------- */}
      <details className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
        <summary className="cursor-pointer font-medium text-white">Как се определя резултатът</summary>
        <div className="mt-3 space-y-2">
          <p>
            Всяко изискване получава един от изходите: <b>Изпълнено</b> (потвърдено с данни), <b>Нарушение</b>{" "}
            (данните показват неизпълнение), <b>Нужни са данни</b> (изпълнението не може да се потвърди),{" "}
            <b>Предстои</b> (срокът още не е изтекъл) или <b>Информация</b>.
          </p>
          <p>
            <b>Не съответства</b> — има нарушение с висока или критична тежест. <b>Неокончателен</b> — липсват данни
            за такова изискване. <b>Частично</b> — има пропуски със средна или ниска тежест или предстоящи срокове.
            <b> Съответства</b> — всички приложими изисквания са потвърдени.
          </p>
          <p>
            Рисковият резултат се определя от най-тежкия проблем (критичен 80, висок 55, среден 30, нисък 10) плюс
            добавка за всеки следващ (10 / 7 / 4 / 2), до максимум 100.
          </p>
        </div>
      </details>

      <p className="mt-6 text-xs text-slate-500">
        Автоматизирана предварителна оценка по Регламент (ЕС) 2023/1114 (MiCA) и свързаните насоки на ESMA. Не
        представлява правно становище; резултатите трябва да бъдат прегледани от квалифициран специалист по
        съответствието. Декларираните от потребителя данни не се проверяват автоматично.
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | null; tone: string }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className={`mt-1 text-xl font-semibold ${value ? tone : "text-slate-500"}`}>{value ?? 0}</dd>
    </div>
  );
}

function Input({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function TriInput({ label, value }: { label: string; value: unknown }) {
  if (typeof value !== "string") return null;
  return <Input label={label} value={TRI_LABEL[value] ?? value} />;
}
