import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITY_LABEL, CLASSIFICATION_LABEL, formatDate } from "@/lib/mica/labels";
import { isMirror, isStale, loadRegisterStatus, REGISTER_STALE_DAYS } from "@/lib/esma/lookup";
import { createCheck } from "../actions";
import { CheckForm, type FormAsset } from "../check-form";

type Params = Promise<{ orgSlug: string }>;

export default function NewCheckPage({ params }: { params: Params }) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <Suspense fallback={<p className="text-slate-400">Зареждане…</p>}>
        <NewCheck params={params} />
      </Suspense>
    </main>
  );
}

async function NewCheck({ params }: { params: Params }) {
  await connection();
  const { orgSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, casp_license_number, lei, monthly_check_quota")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) notFound();

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [{ data: membership }, { data: assets }, { count: used }, registerStatus] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("crypto_assets")
      .select(
        "id, symbol, name, blockchain, mica_classification, identifiable_issuer, issuer_name, issuer_authorisation, anonymisation_function, whitepaper_url, whitepaper_notified_at"
      )
      .order("symbol"),
    supabase
      .from("compliance_checks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .gte("created_at", monthStart),
    loadRegisterStatus(supabase),
  ]);
  const caspReg = registerStatus.casp;

  const canRun = membership && membership.role !== "viewer";
  const quota = org.monthly_check_quota as number;
  const remaining = Math.max(0, quota - (used ?? 0));

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/dashboard/${orgSlug}/checks`} className="text-sm text-slate-400 hover:text-white">
        ← Към историята
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Нова проверка</h1>
          <p className="mt-1 text-sm text-slate-400">{org.name}</p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <p>
            Проверки този месец: {used ?? 0} от {quota}
          </p>
          <p className={isStale(caspReg) ? "text-amber-300" : undefined}>
            {caspReg
              ? `Регистър на ESMA: обновен ${formatDate(caspReg.last_success_at)}${isMirror(caspReg) ? " (резервно копие)" : ""}`
              : "Регистърът на ESMA не е зареден"}
          </p>
        </div>
      </div>

      {isStale(caspReg) && (
        <div className="mt-4 rounded-lg border border-amber-900 bg-amber-950/40 p-3 text-sm text-amber-200">
          Копието на регистъра на ESMA е по-старо от {REGISTER_STALE_DAYS} дни. Обнови го преди проверки, на които
          ще се разчита.
        </div>
      )}

      {!org.casp_license_number && !org.lei && (
        <div className="mt-4 rounded-lg border border-amber-900 bg-amber-950/40 p-3 text-sm text-amber-200">
          Няма въведени LEI и лиценз или нотификация. При услуги за криптоактиви проверката ще го отчете като
          критичен пропуск.{" "}
          <Link href={`/dashboard/${orgSlug}/settings`} className="underline">
            Въведи в Настройки
          </Link>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        {!canRun ? (
          <p className="text-slate-300">Ролята ти (Наблюдател) позволява само преглед на проверките.</p>
        ) : remaining === 0 ? (
          <p className="text-slate-300">Месечният лимит от проверки е изчерпан.</p>
        ) : !assets || assets.length === 0 ? (
          <p className="text-slate-300">Каталогът с активи е празен.</p>
        ) : (
          <CheckForm
            action={createCheck.bind(null, orgSlug)}
            assets={assets as FormAsset[]}
            classificationLabels={CLASSIFICATION_LABEL}
            activityLabels={ACTIVITY_LABEL}
          />
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Автоматизирана предварителна оценка по Регламент (ЕС) 2023/1114 (MiCA). Не представлява правно становище.
      </p>
    </div>
  );
}
