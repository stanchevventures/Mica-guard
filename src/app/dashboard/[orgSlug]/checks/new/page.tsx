import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CLASSIFICATION_LABEL } from "@/lib/mica/labels";
import { createCheck } from "../actions";
import { CheckForm } from "../check-form";

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
    .select("id, name")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) notFound();

  const [{ data: membership }, { data: assets }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("crypto_assets")
      .select("id, symbol, name, blockchain, mica_classification")
      .order("symbol"),
  ]);

  const canRun = membership && membership.role !== "viewer";

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/dashboard/${orgSlug}/checks`} className="text-sm text-slate-400 hover:text-white">
        ← Към историята
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Нова проверка</h1>
      <p className="mt-1 text-sm text-slate-400">{org.name}</p>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        {!canRun ? (
          <p className="text-slate-300">Ролята ти (Наблюдател) позволява само преглед на проверките.</p>
        ) : !assets || assets.length === 0 ? (
          <p className="text-slate-300">Каталогът с активи е празен. Пусни SQL файла с началните данни.</p>
        ) : (
          <CheckForm
            action={createCheck.bind(null, orgSlug)}
            assets={assets}
            classificationLabels={CLASSIFICATION_LABEL}
          />
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Автоматичната оценка е предварителна и не представлява правно становище.
      </p>
    </div>
  );
}
