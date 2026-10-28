// Бърза проверка на живия сайт след публикуване — без вход и без промени по данните.
//
//   node scripts/smoke.mts https://app.micaguard.eu
//   node scripts/smoke.mts https://app.micaguard.eu https://micaguard.eu   (+ пренасочването от основния домейн)
//
// Изход 0 = всичко е наред; 1 = има проблем (до всеки е написано какво да направиш).

const base = (process.argv[2] ?? "").replace(/\/+$/, "");
const mainDomain = (process.argv[3] ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(base)) {
  console.log("Употреба: node scripts/smoke.mts https://app.micaguard.eu [https://micaguard.eu]");
  process.exit(1);
}

let failed = 0;
function report(ok: boolean, name: string, hint = "") {
  if (ok) console.log(`✓ ${name}`);
  else {
    failed++;
    console.log(`✗ ${name}${hint ? `\n    → ${hint}` : ""}`);
  }
}

async function get(path: string, manual = false): Promise<{ status: number; text: string; headers: Headers; location: string }> {
  const url = path.startsWith("http") ? path : `${base}${path}`;
  try {
    const res = await fetch(url, { redirect: manual ? "manual" : "follow", headers: { "user-agent": "mica-guard-smoke" } });
    const text = manual ? "" : await res.text();
    return { status: res.status, text, headers: res.headers, location: res.headers.get("location") ?? "" };
  } catch (e) {
    return { status: 0, text: String((e as Error).message), headers: new Headers(), location: "" };
  }
}

const home = await get("/");
report(home.status === 200 && home.text.includes("MiCA-Guard"), `Начална страница (${home.status})`, "Провери във Vercel дали последният deploy е Ready.");

const hsts = home.headers.get("strict-transport-security") ?? "";
const xfo = home.headers.get("x-frame-options") ?? "";
report(base.startsWith("http://") || (hsts.includes("max-age") && xfo.toUpperCase() === "DENY"), "Заглавки за сигурност (HSTS, X-Frame-Options)", "vercel.json трябва да е в корена на проекта.");

const en = await get("/en");
report(en.status === 200 && en.text.includes("Can you offer this token"), `Английска начална страница /en (${en.status})`);

const sc = await get("/stablecoins");
const scOk = sc.status === 200 && sc.text.includes("Вписан в ESMA") && sc.text.includes("USDT");
report(
  scOk,
  `Стейбълкойн чекър /stablecoins (${sc.status})`,
  sc.text.includes("временно не е достъпен")
    ? "Пусни миграция 0007 в Supabase → SQL Editor (отваря регистъра за четене без вход)."
    : sc.text.includes("Не е в регистъра") && !sc.text.includes("Вписан в ESMA")
      ? "Регистърът на ESMA изглежда празен: Vercel → Settings → Cron Jobs → Run (или npm run esma-sync)."
      : "Провери последния deploy във Vercel."
);

const scEn = await get("/en/stablecoins");
report(scEn.status === 200 && scEn.text.includes("Listed with ESMA"), `Stablecoin checker /en/stablecoins (${scEn.status})`);

const login = await get("/login");
report(login.status === 200, `Вход /login (${login.status})`);

const dash = await get("/dashboard", true);
report([302, 303, 307, 308].includes(dash.status) && dash.location.includes("/login"), `Таблото без вход води към /login (${dash.status})`, "proxy.ts трябва да пази /dashboard.");

const cron = await get("/api/cron/esma-sync", true);
report(
  cron.status === 401,
  `Cron задачата иска ключ (${cron.status})`,
  cron.status === 500
    ? "Липсва CRON_SECRET във Vercel → Settings → Environment Variables (Production) → Redeploy."
    : "Очаквано е 401 без ключ."
);

const sitemap = await get("/sitemap.xml");
report(sitemap.status === 200 && sitemap.text.includes("/stablecoins"), `sitemap.xml (${sitemap.status})`);
if (!sitemap.text.includes(new URL(base).host)) {
  console.log(`  i sitemap.xml сочи към друг адрес — провери NEXT_PUBLIC_SITE_URL във Vercel (трябва да е ${base}).`);
}

if (mainDomain) {
  const main = await get(mainDomain, true);
  report(
    [301, 302, 307, 308].includes(main.status) && main.location.startsWith(base),
    `${mainDomain} пренасочва към ${base} (${main.status}${main.location ? ` → ${main.location}` : ""})`,
    "jump.bg → cPanel → Domains → Redirects (виж docs/DEPLOY.md, раздел 5)."
  );
}

console.log(failed === 0 ? "\nВсичко е наред." : `\nПроблеми: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
