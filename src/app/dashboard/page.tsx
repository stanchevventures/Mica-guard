import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signout } from "../login/actions";

type Org = {
  id: string;
  name: string;
  slug: string;
  entity_type: string;
  country_code: string | null;
  plan: string;
};

type Membership = {
  role: "owner" | "admin" | "analyst" | "viewer";
  organizations: Org | Org[] | null;
};

const ROLE_LABELS: Record<Membership["role"], string> = {
  owner: "Собственик",
  admin: "Администратор",
  analyst: "Анализатор",
  viewer: "Наблюдател",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Безплатен",
  starter: "Starter",
  pro: "Professional",
  enterprise: "Enterprise",
};

const ENTITY_LABELS: Record<string, string> = {
  casp: "CASP",
  issuer: "Емитент",
  credit_institution: "Кредитна институция",
  csd: "Централен депозитар",
  investment_firm: "Инвестиционен посредник",
  emi: "Институция за е-пари",
  fund_manager: "Управляващо дружество / ЛУАИФ",
  market_operator: "Пазарен оператор",
  other: "Друго",
};

export default function DashboardPage() {
  return (
    <main className="min-h-screen px-6 py-10 text-white">
      <h1 className="text-2xl font-bold tracking-tight">Табло</h1>
      <Suspense fallback={<p className="mt-4 text-slate-400">Зареждане…</p>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}

async function DashboardContent() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
    supabase
      .from("organization_members")
      .select("role, organizations(id, name, slug, entity_type, country_code, plan)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true }),
  ]);

  // Нов потребител без организация -> към създаване на организация
  if (!memberships || memberships.length === 0) redirect("/onboarding");

  const orgs = (memberships as unknown as Membership[])
    .map((m) => ({
      role: m.role,
      org: Array.isArray(m.organizations) ? m.organizations[0] : m.organizations,
    }))
    .filter((m): m is { role: Membership["role"]; org: Org } => Boolean(m.org));

  return (
    <div className="mt-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div>
          <p className="text-slate-400">Влязъл си като:</p>
          <p className="mt-1 text-lg">{profile?.full_name || profile?.email || user.email}</p>
        </div>
        <form action={signout}>
          <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
            Изход
          </button>
        </form>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Твоите организации</h2>
          <Link href="/onboarding" className="text-sm text-cyan-300 hover:text-cyan-200">
            + Нова организация
          </Link>
        </div>

        <ul className="space-y-3">
          {orgs.map(({ role, org }) => (
            <li key={org.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-medium">{org.name}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {ENTITY_LABELS[org.entity_type] ?? org.entity_type}
                    {org.country_code ? ` · ${org.country_code}` : ""} · план {PLAN_LABELS[org.plan] ?? org.plan}
                  </p>
                </div>
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300 ring-1 ring-inset ring-cyan-500/30">
                  {ROLE_LABELS[role]}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/dashboard/${org.slug}/checks`}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                >
                  Проверки →
                </Link>
                <Link
                  href={`/dashboard/${org.slug}/portfolio`}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                >
                  Портфейл
                </Link>
                {role !== "viewer" && (
                  <Link
                    href={`/dashboard/${org.slug}/checks/new`}
                    className="rounded-lg btn-grad px-3 py-1.5 text-sm font-medium"
                  >
                    + Нова проверка
                  </Link>
                )}
                <Link
                  href={`/dashboard/${org.slug}/settings`}
                  className="ml-auto rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  Настройки
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
