import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

      <p className="mt-4 text-xs text-slate-500">
        Данните се ползват в проверките (правило AUTH-001). Те се въвеждат от организацията и
        трябва да съответстват на регистъра на ESMA.
      </p>
    </div>
  );
}
