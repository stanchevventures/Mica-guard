"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "@/lib/auth/redirect";

export type ResetState = { error?: string };

const schema = z
  .object({
    password: z.string().min(8, "Паролата трябва да е поне 8 символа").max(72, "Паролата е твърде дълга"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Двете пароли не съвпадат", path: ["confirm"] });

export async function updatePassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const parsed = schema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Линкът е изтекъл. Поискай нов от страницата за вход." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authErrorMessage(error.code, "Паролата не можа да бъде сменена. Опитай отново.") };

  // Излизане от всички други устройства — ако някой е знаел старата парола
  await supabase.auth.signOut({ scope: "others" });

  redirect("/dashboard");
}
