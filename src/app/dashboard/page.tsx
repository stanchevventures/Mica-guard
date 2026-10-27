import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signout } from "../login/actions";
import { connection } from "next/server";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <h1 className="text-2xl font-semibold">Табло</h1>
      <Suspense fallback={<p className="mt-4 text-slate-400">Зареждане…</p>}>
        <Account />
      </Suspense>
    </main>
  );
}

async function Account() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="mt-6 max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-slate-400">Влязъл си като:</p>
      <p className="mt-1 text-lg">{profile?.full_name || profile?.email || user.email}</p>

      <form action={signout} className="mt-6">
        <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
          Изход
        </button>
      </form>
    </div>
  );
}
