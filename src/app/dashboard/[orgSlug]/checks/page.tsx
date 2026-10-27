import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  RESULT_LABEL,
  RESULT_STYLE,
  STATUS_LABEL,
  formatDate,
} from "@/lib/mica/labels";

type Params = Promise<{ orgSlug: string }>;

type Row = {
  id: string;
  created_at: string;
  status: string;
  result: string | null;
  risk_score: number | null;
  symbol: string;
  asset_name: string;
  requested_by_name: string | null;
  failed_findings: number;
};

export default function ChecksPage({ params }: { params: Params }) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <Suspense fallback={<p className="text-slate-400">Зареждане…</p>}>
        <ChecksList params={params} />
      </Suspense>
    </main>
  );
}

async function ChecksList({ params }: { params: Params }) {
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

  const { data } = await supabase
    .from("v_check_history")
    .select("id, created_at, status, result, risk_score, symbol, asset_name, requested_by_name, failed_findings")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const checks = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">
        ← Табло
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Проверки</h1>
          <p className="mt-1 text-sm text-slate-400">{org.name}</p>
        </div>
        <Link
          href={`/dashboard/${orgSlug}/checks/new`}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
        >
          + Нова проверка
        </Link>
      </div>

      {checks.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-400">
          Още няма проверки. Пусни първата!
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium">Актив</th>
                <th className="px-4 py-3 font-medium">Резултат</th>
                <th className="px-4 py-3 font-medium">Риск</th>
                <th className="px-4 py-3 font-medium">Неизпълнени</th>
                <th className="px-4 py-3 font-medium">Пусната от</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {checks.map((c) => (
                <tr key={c.id} className="hover:bg-slate-900/60">
                  <td className="px-4 py-3 text-slate-300">
                    <Link href={`/dashboard/${orgSlug}/checks/${c.id}`} className="hover:underline">
                      {formatDate(c.created_at)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{c.symbol}</span>{" "}
                    <span className="text-slate-400">{c.asset_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    {c.result ? (
                      <span className={`rounded-full px-2.5 py-1 text-xs ${RESULT_STYLE[c.result]}`}>
                        {RESULT_LABEL[c.result]}
                      </span>
                    ) : (
                      <span className="text-slate-400">{STATUS_LABEL[c.status] ?? c.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{c.risk_score ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{c.failed_findings}</td>
                  <td className="px-4 py-3 text-slate-400">{c.requested_by_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
