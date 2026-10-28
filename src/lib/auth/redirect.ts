// Безопасни пренасочвания след вход и след линк от имейл.
// Без импорти — ползва се и от тестовете (node --experimental-strip-types).

/** Страници, към които линк от имейл може да пренасочи */
const ALLOWED_PREFIXES = ["/dashboard", "/reset-password", "/onboarding"];

/**
 * Връща вътрешен път само ако е от разрешените; иначе `fallback`.
 * Предпазва от „отворено пренасочване“ (?next=https://зловреден.сайт).
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  let path: string;
  try {
    path = decodeURIComponent(next).trim();
  } catch {
    return fallback;
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /[\u0000-\u001f]/.test(path)) {
    return fallback;
  }
  const ok = ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`));
  return ok ? path : fallback;
}

/** Типовете еднократни линкове, които Supabase изпраща по имейл */
export const EMAIL_OTP_TYPES = ["signup", "invite", "magiclink", "recovery", "email_change", "email"] as const;
export type EmailLinkType = (typeof EMAIL_OTP_TYPES)[number];

export function isEmailLinkType(v: string | null): v is EmailLinkType {
  return v !== null && (EMAIL_OTP_TYPES as readonly string[]).includes(v);
}

/** Грешките на Supabase Auth на разбираем български */
export function authErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return "Вече има профил с този имейл. Влез или използвай „Забравена парола“.";
    case "weak_password":
      return "Паролата е твърде слаба. Използвай поне 8 символа с букви и цифри.";
    case "same_password":
      return "Новата парола трябва да е различна от старата.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Твърде много опити. Изчакай няколко минути и опитай отново.";
    case "email_address_invalid":
      return "Имейлът не е валиден.";
    case "signup_disabled":
      return "Регистрацията временно е спряна.";
    default:
      return fallback;
  }
}
