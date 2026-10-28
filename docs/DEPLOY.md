# MiCA-Guard — публикуване и поддръжка

Адресът на приложението е **https://app.micaguard.eu**. Основният домейн micaguard.eu води към него с пренасочване (раздел 5), а пощата team@micaguard.eu остава в jump.bg.

## 0. По ред (около 1,5 часа)

1. **Нова версия:** `update.ps1` с пакета (раздел 8). Скриптът качва в GitHub само ако тестовете и build-ът минат.
2. **Миграции:** Supabase → SQL Editor → пусни поред **0006**, после **0007**. И двете може да се пускат повторно.
3. **Нов secret ключ** (раздел 1).
4. **app.micaguard.eu** (раздел 5, стъпки 1–3) → изчакай **Valid Configuration**.
5. **Адресът в настройките:** Vercel → `NEXT_PUBLIC_SITE_URL` (раздел 2) и Supabase → URL Configuration (раздел 3) → **Redeploy**.
6. **Пренасочване** micaguard.eu → app.micaguard.eu (раздел 5, стъпка 4).
7. **Имейли:** Resend и шаблоните (раздели 4 и 6). Ако DNS проверката на Resend не мине навреме — временното решение в раздел 3.
8. **Проверка:** `node scripts/smoke.mts https://app.micaguard.eu https://micaguard.eu`, после ръчно по списъка в раздел 7.

## 1. Смяна на secret ключа

Старият ключ е бил видим на снимка, затова се сменя.

1. Supabase → **Project Settings → API Keys → Secret keys → Create new secret key**.
2. В `.env.local` замени стойността на `SUPABASE_SECRET_KEY` с новия ключ и рестартирай `npm run dev`.
3. Пусни една проверка локално — трябва да работи.
4. Vercel → **Settings → Environment Variables** → `SUPABASE_SECRET_KEY` → **Edit** → новия ключ → **Save** → **Redeploy**.
5. Провери една проверка на живия сайт → Supabase → изтрий стария ключ.

Ключът не се снима, не се праща в чат и никога не започва с `NEXT_PUBLIC_`.

## 2. Vercel

**Environment Variables** (Production и Preview):

| Име | Стойност |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | от `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | от `.env.local` (публичният ключ) |
| `SUPABASE_SECRET_KEY` | новият secret ключ |
| `CRON_SECRET` | случаен низ от 40 символа (командата е по-долу), само за Production |
| `NEXT_PUBLIC_SITE_URL` | `https://app.micaguard.eu` (докато домейнът не е готов — адресът `….vercel.app`) |

След всяка промяна на променливите: **Deployments → ⋯ → Redeploy**.

Случаен `CRON_SECRET` в PowerShell:

```powershell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | ForEach-Object {[char]$_})
```

От `vercel.json` автоматично идват:

- **регион fra1 (Франкфурт)** — до базата в Supabase, данните остават в ЕС;
- **обновяване на регистъра всеки ден** около 05:00 UTC (на безплатния план — в рамките на часа). Ръчно: **Settings → Cron Jobs → Run**;
- **заглавки за сигурност** (HSTS, забрана за вграждане във frame, Referrer-Policy и др.).

Безплатният план на Vercel е само за нетърговска употреба. Преди първия платен клиент: **Pro**.

## 3. Supabase → Authentication

**URL Configuration**

- Site URL: `https://app.micaguard.eu`
- Redirect URLs: `https://app.micaguard.eu/**`, `https://<проектът>.vercel.app/**`, `http://localhost:3000/**`

Без тях линковете в имейлите водят към грешен адрес.

**SMTP** (Emails → SMTP Settings → Enable custom SMTP). Без собствен SMTP Supabase изпраща имейли само до членовете на екипа на проекта — непознат човек не може да потвърди регистрацията си.

| Поле | Стойност |
| --- | --- |
| Sender email | `noreply@micaguard.eu` |
| Sender name | `MiCA-Guard` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | API ключът от Resend (раздел 4) |

**Rate Limits** → лимитът за имейли на час → 100.

**Временно решение, ако Resend не е готов преди демо:** Authentication → **Sign In / Providers → Email** → изключи **Confirm email**. Новите профили влизат веднага, без имейл (приложението ги води направо към създаване на организация). Включи го отново веднага щом Resend работи — иначе всеки може да се регистрира с чужд имейл.

## 4. Resend (изпращане на имейли)

1. resend.com → регистрация → **Domains → Add domain** → `micaguard.eu`; регион — **EU (Ireland)**.
2. Resend показва DNS записи за поддомейна `send` (MX и TXT) и за DKIM (`resend._domainkey`). Добави ги в jump.bg → cPanel → **Zone Editor**. Съществуващите MX записи за `micaguard.eu` не се пипат — те обслужват team@micaguard.eu.
3. **Verify** (от минути до няколко часа), после **API Keys → Create API key** (Sending access) → постави го в Supabase като SMTP парола.

Безплатно: 3000 имейла на месец, 100 на ден.

## 5. Домейнът

**app.micaguard.eu → приложението**

1. Vercel → **Settings → Domains → Add** → `app.micaguard.eu`.
2. Vercel показва запис **CNAME** с име `app` и стойност. В jump.bg → cPanel → **Zone Editor** → при micaguard.eu → **+ CNAME Record**: Name `app`, CNAME — стойността от Vercel.
3. Не пипай другите записи. Изчакай във Vercel **Valid Configuration** (обикновено 5–30 минути).

**micaguard.eu → app.micaguard.eu (пренасочване)**

4. След като app.micaguard.eu работи: cPanel → **Domains → Redirects**:
   - Type: **Temporary (302)** — лесно се връща назад;
   - домейн: `micaguard.eu`, пътят — празен;
   - Redirects to: `https://app.micaguard.eu`;
   - www. redirection: **Redirect with or without www.**;
   - **Add**. Провери в прозорец Incognito.

DNS записите на micaguard.eu не се променят, затова пощата продължава да работи.

**По-късно (не преди демо):** целият micaguard.eu може да се премести във Vercel. В cPanel MX записът често сочи към самия `micaguard.eu` — ако се смени A записът за `@`, пощата спира. Затова първо MX трябва да сочи към отделен адрес (напр. `mail.micaguard.eu`) и едва тогава се местят `@` и `www`.

## 6. Шаблони на имейлите

Supabase → **Authentication → Emails → Templates**. Линковете водят към `/auth/callback` с `token_hash` — работят и когато имейлът се отвори на друго устройство.

**Confirm signup**

Тема: `Потвърди имейла си за MiCA-Guard`

```html
<h2>Добре дошъл в MiCA-Guard</h2>
<p>Натисни бутона, за да потвърдиш имейла си и да влезеш в профила.</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/dashboard">Потвърди имейла</a></p>
<p>Ако не си създавал профил в MiCA-Guard, просто игнорирай това съобщение.</p>
```

**Reset password**

Тема: `Нова парола за MiCA-Guard`

```html
<h2>Смяна на паролата</h2>
<p>Получихме заявка за нова парола за този имейл.</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Задай нова парола</a></p>
<p>Линкът е валиден 1 час. Ако не си поискал смяна, игнорирай това съобщение — паролата остава същата.</p>
```

## 7. Проверка след публикуване

Автоматично (от папката на проекта, около 10 секунди; нищо не променя):

```powershell
node scripts/smoke.mts https://app.micaguard.eu https://micaguard.eu
```

Скриптът проверява началните страници, стейбълкойн чекъра, защитата на таблото и на cron задачата, заглавките за сигурност и пренасочването, и казва какво да направиш при проблем. После ръчно:

- [ ] https://app.micaguard.eu отваря началната страница; https://micaguard.eu пренасочва към нея
- [ ] `/stablecoins` и `/en/stablecoins` показват таблицата без вход (иначе: пусни миграция 0007)
- [ ] Бутонът **EN / BG** горе вдясно сменя езика на публичните страници
- [ ] Табло → организация → **Портфейл** → списък токени → таблица и **Изтегли CSV**
- [ ] **Пълна проверка →** от портфейла отваря новата проверка с избран токен
- [ ] Регистрация с имейл, който не е в екипа на Supabase → имейлът идва до минута → линкът влиза в таблото
- [ ] Организация → проверка → PDF доклад
- [ ] „Забравена парола“ → имейл → нова парола → вход
- [ ] Vercel → Cron Jobs → **Run** → в Supabase таблицата `esma_register_imports` има нов ред със статус `succeeded`
- [ ] Отвори сайта от телефон
- [ ] team@micaguard.eu получава писмо (пощата не е засегната)

## 8. Нова версия и седмична поддръжка

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\update.ps1 -Zip "$HOME\Downloads\mica-guard-vX.Y.zip"
```

Скриптът пуска тестовете и build-а и качва в GitHub само ако всичко мине. SQL миграциите от пакета се пускат ръчно в Supabase → SQL Editor.

Всяка седмица: Supabase → Table Editor → `esma_register_imports` — последните импорти са `succeeded`. Ако не са — `npm run esma-sync` (или `npm run esma-sync -- --mirror`, ако сайтът на ESMA не отговаря).
