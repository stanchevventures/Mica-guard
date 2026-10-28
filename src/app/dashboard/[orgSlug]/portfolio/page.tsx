import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runPortfolio } from "./actions";
import { PortfolioForm } from "./portfolio-form";

type Params = Promise<{ orgSlug: string }>;

export default function PortfolioPage({ params }: { params: Params }) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <Suspense fallback={<p className="text-slate-400">Зареждане…</p>}>
        <Portfolio params={params} />
      </Suspense>
    </main>
  );
}

async function Portfolio({ params }: { params: Params }) {
  await connection();
  const { orgSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase.from("organizations").select("id, name, lei").eq("slug", orgSlug).maybeSingle();
  if (!org) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href={`/dashboard/${orgSlug}/checks`} className="text-sm text-slate-400 hover:text-white">
        ← Към проверките
      </Link>
      <div className="mt-3">
        <h1 className="text-2xl font-semibold">Проверка на портфейл</h1>
        <p className="mt-1 text-sm text-slate-400">
          {org.name} — всички токени наведнъж: лиценз на емитента, бяла книга и срокове по MiCA, сверени с регистъра на
          ESMA.
        </p>
      </div>

      {!org.lei && (
        <div className="mt-4 rounded-lg border border-amber-900 bg-amber-950/40 p-3 text-sm text-amber-200">
          Няма въведен LEI — лицензът на организацията няма да бъде сверен с регистъра на ESMA.{" "}
          <Link href={`/dashboard/${orgSlug}/settings`} className="underline">
            Въведи в Настройки
          </Link>
        </div>
      )}

      <div className="mt-6">
        <PortfolioForm action={runPortfolio.bind(null, orgSlug)} orgSlug={orgSlug} />
      </div>
    </div>
  );
}
