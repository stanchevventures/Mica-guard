import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncEsmaRegister, type SyncClient } from "@/lib/esma/register";

// Ежедневно обновяване на регистъра на ESMA (график във vercel.json).
// Vercel изпраща заглавка `Authorization: Bearer <CRON_SECRET>`; без нея заявката се отказва.
// Ръчно пускане: Vercel → Settings → Cron Jobs → Run.

function authorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: Request) {
  await connection(); // винаги при заявка, никога предварително при build
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    return Response.json({ error: "CRON_SECRET липсва или е по-къс от 16 символа" }, { status: 500 });
  }
  if (!authorized(request.headers.get("authorization"), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const report = await syncEsmaRegister(createAdminClient() as unknown as SyncClient, { trigger: "cron" });
    return Response.json(
      {
        status: report.status,
        files: report.files.map((f) => ({
          register: f.register,
          ok: f.ok,
          rows: f.rows ?? null,
          unchanged: f.unchanged ?? false,
          error: f.error ?? null,
        })),
      },
      { status: report.status === "failed" ? 502 : 200 }
    );
  } catch (e) {
    return Response.json({ status: "failed", error: (e as Error).message }, { status: 500 });
  }
}
