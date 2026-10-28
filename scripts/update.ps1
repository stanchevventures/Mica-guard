# MiCA-Guard — инсталиране на нова версия с една команда.
#
#   powershell -ExecutionPolicy Bypass -File .\scripts\update.ps1 -Zip "$HOME\Downloads\mica-guard-v1.5.zip"
#
# Стъпки: разархивира пакета (ако е подаден), пуска тестовете и build-а и качва в GitHub
# само ако всичко е зелено. Vercel публикува автоматично след качването.
# С -NoPush промените се записват само на компютъра (без качване в GitHub).

param(
  [string]$Zip = "",
  [string]$Message = "",
  [switch]$NoPush
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Step($text) { Write-Host "`n== $text" -ForegroundColor Cyan }
function Fail($text) { Write-Host "`nСПРЯНО: $text" -ForegroundColor Red; exit 1 }

if (-not (Test-Path "$root\package.json")) { Fail "Скриптът трябва да е в папка scripts на проекта." }

# 1. Разархивиране
if ($Zip -ne "") {
  if (-not (Test-Path $Zip)) { Fail "Не намирам $Zip" }
  Step "Разархивирам $(Split-Path -Leaf $Zip)"
  Expand-Archive -Path $Zip -DestinationPath $root -Force
  if ($Message -eq "") { $Message = "MiCA-Guard " + [IO.Path]::GetFileNameWithoutExtension($Zip).Replace("mica-guard-", "") }
}
if ($Message -eq "") { $Message = "MiCA-Guard: обновяване" }

# 2. Еднократни настройки (безопасно е да се пускат многократно)
Step "Проверявам настройките"
$ts = Get-Content "$root\tsconfig.json" -Raw
if ($ts -notmatch '"scripts"' -or $ts -notmatch '"tests"') {
  Fail 'В tsconfig.json добави "scripts" и "tests" в "exclude": ["node_modules", "scripts", "tests"]'
}
npm pkg set "scripts.test=node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/mica-engine.test.mts && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/esma-register.test.mts && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/auth-redirect.test.mts && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/stablecoins.test.mts && node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tests/portfolio.test.mts" | Out-Null
npm pkg set "scripts.esma-sync=node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --env-file=.env.local scripts/esma-sync.mts" | Out-Null
if ((Test-Path "$root\src\app\favicon.ico") -and (Test-Path "$root\src\app\icon.svg")) {
  Remove-Item "$root\src\app\favicon.ico"
  Write-Host "Премахнах стандартната икона на Next.js (вече има icon.svg)."
}
$tracked = git ls-files .env.local
if ($tracked) { Fail ".env.local е качен в Git! Пиши ми, преди да продължиш." }

# 3. Тестове
Step "Тестове"
npm test
if ($LASTEXITCODE -ne 0) { Fail "Има неуспешни тестове. Нищо не е качено." }

# 4. Build (същата проверка, която прави Vercel)
Step "Build"
npm run build
if ($LASTEXITCODE -ne 0) { Fail "Build-ът не мина. Нищо не е качено." }

# 5. Git
Step "Git"
git add -A
$changes = git status --porcelain
if (-not $changes) {
  Write-Host "Няма промени за качване."
} else {
  git commit -m $Message
  if ($LASTEXITCODE -ne 0) { Fail "git commit не мина." }
  if ($NoPush) {
    Write-Host "Записано локално (без качване, защото е подаден -NoPush)."
  } else {
    git push
    if ($LASTEXITCODE -ne 0) { Fail "git push не мина. Провери връзката и опитай: git push" }
    Write-Host "Качено в GitHub. Vercel публикува новата версия до 1-2 минути." -ForegroundColor Green
  }
}

# 6. Напомняне за SQL миграциите (те се пускат ръчно в Supabase -> SQL Editor)
$latest = Get-ChildItem "$root\supabase\migrations\*.sql" | Sort-Object Name | Select-Object -Last 1
if ($latest) {
  Write-Host "`nАко още не си: пусни $($latest.Name) в Supabase -> SQL Editor (миграциите могат да се пускат повторно)." -ForegroundColor Yellow
}
Write-Host "`nГотово." -ForegroundColor Green
