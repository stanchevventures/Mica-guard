// Тестове на безопасните пренасочвания след линк от имейл. Пускане: node tests/auth-redirect.test.mts
import { authErrorMessage, isEmailLinkType, safeNext } from "../src/lib/auth/redirect.ts";

let passed = 0, failed = 0;
function eq(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`✓ ${name}`); }
  else { failed++; console.log(`✗ ${name}\n    получено: ${a}\n    очаквано: ${e}`); }
}

eq("Разрешена вътрешна страница", safeNext("/reset-password"), "/reset-password");
eq("Подстраница на таблото", safeNext("/dashboard/acme/checks"), "/dashboard/acme/checks");
eq("Кодиран път", safeNext("%2Fdashboard%2Facme"), "/dashboard/acme");
eq("Липсващ next -> по подразбиране", safeNext(null), "/dashboard");
eq("Друг сайт", safeNext("https://evil.example/dashboard"), "/dashboard");
eq("Протокол-относителен адрес (//)", safeNext("//evil.example"), "/dashboard");
eq("Обратна наклонена черта", safeNext("/\\evil.example"), "/dashboard");
eq("Кодиран //", safeNext("%2F%2Fevil.example"), "/dashboard");
eq("Неразрешена вътрешна страница", safeNext("/login"), "/dashboard");
eq("Подобно име, но друг път", safeNext("/dashboardevil"), "/dashboard");
eq("Управляващ символ", safeNext("/dashboard%0d%0aSet-Cookie:x"), "/dashboard");
eq("Счупено кодиране", safeNext("%E0%A4%A"), "/dashboard");
eq("Собствен fallback", safeNext("javascript:alert(1)", "/reset-password"), "/reset-password");
eq("Типове линкове", [isEmailLinkType("recovery"), isEmailLinkType("email"), isEmailLinkType("admin"), isEmailLinkType(null)], [true, true, false, false]);
eq("Грешка: съществуващ профил", authErrorMessage("user_already_exists", "x").startsWith("Вече има профил"), true);
eq("Грешка: непознат код -> fallback", authErrorMessage("something_new", "Опитай отново."), "Опитай отново.");

console.log(`\n${passed} успешни, ${failed} неуспешни`);
if (failed > 0) process.exit(1);
