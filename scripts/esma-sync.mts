// Сваля регистъра на ESMA по MiCA и го записва в Supabase.
//
// Пускане от папката на проекта:
//   npm run esma-sync              (същото като: node --env-file=.env.local scripts/esma-sync.mts)
//   npm run esma-sync -- --mirror  (ако сайтът на ESMA е недостъпен: копие на същите файлове в GitHub)
//
// Онлайн същото се изпълнява всеки ден от /api/cron/esma-sync (vercel.json).
//
// Нужни са NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SECRET_KEY от .env.local.
// Secret ключът остава на твоя компютър — скриптът не го показва и не го записва.
import { createClient } from "@supabase/supabase-js";
import { syncEsmaRegister } from "../src/lib/esma/register.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Липсват NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SECRET_KEY. Пусни скрипта с --env-file=.env.local от папката на проекта.");
  process.exit(1);
}

const LABEL = { casp: "Доставчици (CASP)", emt: "Емитенти на EMT", art: "Емитенти на ART", ncasp: "Без лиценз (предупреждения)" } as const;

const mirror = process.argv.includes("--mirror");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
console.log(mirror ? "Свалям регистъра на ESMA по MiCA от резервното копие в GitHub…\n" : "Свалям регистъра на ESMA по MiCA…\n");

try {
  const report = await syncEsmaRegister(supabase, { trigger: "script", mirror });
  for (const f of report.files) {
    const name = LABEL[f.register].padEnd(30);
    if (f.ok) {
      const diff = f.previous_rows ? ` (преди: ${f.previous_rows})` : "";
      console.log(`✓ ${name} ${String(f.rows).padStart(4)} записа${diff}${f.unchanged ? " — без промяна" : ""}`);
      for (const w of f.warnings ?? []) console.log(`    ! ${w}`);
    } else {
      console.log(`✗ ${name} ${f.error}`);
    }
  }
  const verdict = {
    succeeded: "Готово.",
    partial: "Частично: старите данни за неуспешните файлове са запазени.",
    failed: `Неуспешно: старите данни са запазени.${mirror ? "" : " Ако сайтът на ESMA е недостъпен, опитай с --mirror."}`,
  };
  console.log(`\n${verdict[report.status]}`);
  process.exit(report.status === "failed" ? 1 : 0);
} catch (e) {
  console.error(`Грешка: ${(e as Error).message}`);
  console.error("Пусната ли е миграцията 0005_esma_register.sql в Supabase?");
  process.exit(1);
}
