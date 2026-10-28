import { NextResponse, connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isEmailLinkType, safeNext } from "@/lib/auth/redirect";

// Тук водят линковете от имейлите на Supabase:
//   ?code=...                       — стандартният шаблон (PKCE, само в същия браузър)
//   ?token_hash=...&type=email|recovery — нашите шаблони (работят и от друго устройство)
// `next` е страницата след успешен вход; разрешени са само вътрешни страници.
export async function GET(request: Request) {
  await connection();
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next"), type === "recovery" ? "/reset-password" : "/dashboard");

  const supabase = await createClient();

  if (tokenHash && isEmailLinkType(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Изтекъл, вече използван или отворен в друг браузър линк
  return NextResponse.redirect(`${origin}/login?error=link`);
}
