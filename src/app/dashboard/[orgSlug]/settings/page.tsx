import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMirror, isStale, loadRegisterStatus, lookupCasp } from "@/lib/esma/lookup";
import { ACTIVITY_LABEL, formatDate, formatDay } from "@/lib/mica/labels";
import { updateOrgSettings } from "./actions";
import { SettingsForm } from "./settings-form";

type Params = Promise<{ orgSlug: string }>;

export default function SettingsPage({ params }: { params: Params }) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <Suspense fallback={<p className="text-slate-400">Зареждане…</p>}>
        <Settings params={params} />
      </Suspense>
    </main>
  );
}

async function Settings({ params }: { params: Params }) {
  await connection();
  const { orgSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, casp_license_number, nca_name, lei")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) notFound();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const canEdit = membership?.role === "owner" || membership?.role === "admin";

  // Регистър на ESMA: търсим организацията по LEI
  const status = await loadRegisterStatus(supabase);
  let reg: Awaited<ReturnType<typeof lookupCasp>> = null;
  let lookupFailed = false;
  if (org.lei && status.casp) {
    try {
      reg = await lookupCasp(supabase, org.lei, status);
    } catch {
      lookupFailed = true;
    }
  }
  const e = reg?.entry ?? null;
  const ended = !!e?.ended_on && e.ended_on <= new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">
        ← Табло
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Настройки</h1>
      <p className="mt-1 text-sm text-slate-400">{org.name}</p>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 font-medium">Регулаторни данни</h2>
        <SettingsForm
          action={updateOrgSettings.bind(null, orgSlug)}
          initial={{
            casp_license_number: org.casp_license_number,
            nca_name: org.nca_name,
            lei: org.lei,
          }}
          canEdit={canEdit}
        />
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-medium">Регистър на ESMA</h2>
          {status.casp && (
            <span className={`text-xs ${isStale(status.casp) ? "text-amber-300" : "text-slate-500"}`}>
              обновен {formatDate(status.casp.last_success_at)}
              {isMirror(status.casp) ? " · резервно копие" : ""}
            </span>
          )}
        </div>

        {!status.casp ? (
          <p className="mt-3 text-sm text-slate-400">
            Регистърът още не е зареден. Администраторът на платформата го зарежда със скрипта{" "}
            <code className="text-slate-300">scripts/esma-sync.mts</code>.
          </p>
        ) : !org.lei ? (
          <p className="mt-3 text-sm text-slate-400">
            Въведи LEI по-горе — тогава лицензът и услугите се проверяват автоматично в регистъра при всяка проверка.
          </p>
        ) : lookupFailed ? (
          <p className="mt-3 text-sm text-red-400">Търсенето в регистъра не успя. Опитай отново.</p>
        ) : !e ? (
          <p className="mt-3 text-sm text-amber-200">
            LEI <span className="font-mono">{org.lei}</span> не е открито в регистъра на доставчиците на услуги за
            криптоактиви. Провери дали е въведено правилно. Ако лицензът е нов, регистърът може още да не е обновен.
          </p>
        ) : (
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  ended ? "bg-red-950 text-red-300" : "bg-emerald-950 text-emerald-300"
                }`}
              >
                {ended ? "Прекратен" : e.legal_basis === "art60" ? "Нотификация (чл. 60)" : "Лиценз (чл. 63)"}
              </span>
              <span className="font-medium">{e.name}</span>
            </div>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-slate-300">
              <dt className="text-slate-500">Компетентен орган</dt>
              <dd>
                {e.authority ?? "—"}
                {e.home_member_state ? ` (${e.home_member_state})` : ""}
              </dd>
              <dt className="text-slate-500">{ended ? "Прекратен на" : "Вписан от"}</dt>
              <dd>{formatDay(ended ? e.ended_on : e.authorised_on)}</dd>
              {reg?.registered_lei && (
                <>
                  <dt className="text-slate-500">LEI в регистъра</dt>
                  <dd className="text-amber-200">
                    <span className="font-mono">{reg.registered_lei}</span> — вероятна грешка в регистъра
                  </dd>
                </>
              )}
            </dl>
            <div>
              <p className="mb-1 text-slate-500">Вписани услуги</p>
              <div className="flex flex-wrap gap-1.5">
                {e.services.length === 0 ? (
                  <span className="text-slate-400">няма данни</span>
                ) : (
                  e.services.map((s) => (
                    <span key={s} className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-200">
                      {ACTIVITY_LABEL[s] ?? s}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Данните се ползват в проверките (правила AUTH-001 и AUTH-003). С въведен LEI лицензът и обхватът на
        услугите се сверяват с регистъра на ESMA; без LEI се ползва декларираният номер.
      </p>
    </div>
  );
}
