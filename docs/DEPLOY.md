# MiCA-Guard — публикуване и поддръжка

Ръководство стъпка по стъпка. Стъпките 1–6 се правят веднъж; раздел 8 — всяка седмица.

## 1. Смяна на secret ключа (сега)

Старият ключ е бил видим на снимка, затова се сменя преди публикуването.

1. Supabase → **Project Settings → API Keys → Secret keys → Create new secret key**.
2. В `.env.local` замени стойността на `SUPABASE_SECRET_KEY` с новия ключ и рестартирай `npm run dev`.
3. Пусни една проверка локално — трябва да работи.
4. Vercel → **Settings → Environment Variables** → `SUPABASE_SECRET_KEY` → новия ключ → **Redeploy**.
5. Supabase → изтрий стария ключ.

Ключът не се снима, не се праща в чат и никога не започва с `NEXT_PUBLIC_`.

## 2. Vercel

**Environment Variables** (за Production и Preview):

| Име | Стойност |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | от `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | от `.env.local` (публичният ключ) |
| `SUPABASE_SECRET_KEY` | новият secret ключ |
| `CRON_SECRET` | случаен низ от 40 символа (командата е по-долу) |
| `NEXT_PUBLIC_SITE_URL` | `https://micaguard.eu` (докато домейнът не е готов — адресът `….vercel.app`) |

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

- Site URL: `https://micaguard.eu`
- Redirect URLs: `https://micaguard.eu/**`, `https://<проектът>.vercel.app/**`, `http://localhost:3000/**`

**SMTP** (Emails → SMTP Settings → Enable custom SMTP). Без собствен SMTP Supabase изпраща имейли само до членовете на екипа на проекта.

| Поле | Стойност |
| --- | --- |
| Sender email | `noreply@micaguard.eu` |
| Sender name | `MiCA-Guard` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | API ключът от Resend (раздел 4) |

**Rate Limits** → лимитът за имейли на час → 100.

## 4. Resend (изпращане на имейли)

1. resend.com → регистрация → **Domains → Add domain** → `micaguard.eu`; ако има избор на регион — ЕС.
2. Resend показва DNS записи за поддомейна `send` и за DKIM. Добави ги в DNS на jump.bg (cPanel → **Zone Editor**). Съществуващите MX записи за `micaguard.eu` не се пипат — те обслужват team@micaguard.eu.
3. **Verify**, после **API Keys → Create API key** (Sending access) → постави го в Supabase като SMTP парола.

Безплатно: 3000 имейла на месец, 100 на ден.

## 5. Домейнът micaguard.eu → Vercel

1. Vercel → **Settings → Domains → Add** → `micaguard.eu` и `www.micaguard.eu` (пренасочване към основния).
2. Vercel показва какви записи да добавиш (за `micaguard.eu` и за `www`). Добави ги в Zone Editor на jump.bg и премахни старите A/CNAME записи за `@` и `www`, които сочат към хостинга.
3. MX и TXT записите за пощата остават.
4. Изчакай Vercel да покаже **Valid Configuration** (от минути до няколко часа).

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

- [ ] micaguard.eu отваря началната страница по https
- [ ] Регистрация с имейл, който не е в екипа на Supabase → имейлът идва до минута → линкът влиза в таблото
- [ ] Организация → проверка → PDF доклад
- [ ] „Забравена парола“ → имейл → нова парола → вход
- [ ] Vercel → Cron Jobs → **Run** → в Supabase таблицата `esma_register_imports` има нов ред със статус `succeeded`
- [ ] Отвори сайта от телефон

## 8. Седмична поддръжка

- Supabase → Table Editor → `esma_register_imports`: последните импорти са `succeeded`. Ако не са — `npm run esma-sync` (или с `--mirror`, ако сайтът на ESMA не отговаря: `npm run esma-sync -- --mirror`).
- Нова версия на MiCA-Guard:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\update.ps1 -Zip "$HOME\Downloads\mica-guard-vX.Y.zip"
```

  Скриптът пуска тестовете и build-а и качва в GitHub само ако всичко мине. SQL миграцията от пакета се пуска ръчно в Supabase → SQL Editor.
