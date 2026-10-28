"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "@/lib/auth/redirect";

export type AuthState = { error?: string; message?: string };

const email = z.string().trim().email("Невалиден имейл адрес");

const credentials = z.object({
  email,
  password: z.string().min(8, "Паролата трябва да е поне 8 символа"),
});

/** Адресът на сайта, от който идва заявката — линковете в имейлите водят обратно тук */
async function siteOrigin(): Promise<string> {
  const origin = (await headers()).get("origin");
  return origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Първо потвърди имейла си от линка, който ти изпратихме." };
    }
    if (error.code === "over_request_rate_limit") return { error: authErrorMessage(error.code, "") };
    return { error: "Грешен имейл или парола." };
  }

  redirect("/dashboard");
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 120);
  const origin = await siteOrigin();

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      data: { full_name: fullName || null },
    },
  });

  if (error) return { error: authErrorMessage(error.code, "Регистрацията не успя. Опитай отново.") };

  return { message: "Готово! Провери имейла си и натисни линка за потвърждение." };
}

/** Линк за нова парола. Отговорът е един и същ, независимо дали имейлът съществува. */
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const origin = await siteOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { error: authErrorMessage(error.code, "") };
  }

  return {
    message: "Ако има профил с този имейл, ще получиш линк за нова парола до няколко минути.",
  };
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
