"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isValidLei } from "@/lib/esma/register";

export type SettingsState = { error?: string; message?: string };

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Максимум ${max} символа`)
    .transform((v) => (v === "" ? null : v));

const schema = z.object({
  casp_license_number: optional(100),
  nca_name: optional(200),
  lei: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[A-Z0-9]{18}[0-9]{2}$/.test(v), "LEI трябва да е 20 символа (ISO 17442)")
    .refine((v) => v === "" || isValidLei(v), "Невалиден LEI — контролните цифри не съвпадат. Провери за грешка при въвеждането.")
    .transform((v) => (v === "" ? null : v)),
});

export async function updateOrgSettings(
  orgSlug: string,
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const parsed = schema.safeParse({
    casp_license_number: formData.get("casp_license_number") ?? "",
    nca_name: formData.get("nca_name") ?? "",
    lei: formData.get("lei") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  // RLS позволява промяна само на owner/admin. Ако няма права, обновените редове са 0.
  const { data, error } = await supabase
    .from("organizations")
    .update(parsed.data)
    .eq("slug", orgSlug)
    .select("id");

  if (error) {
    if (error.code === "23505") return { error: "Този LEI вече е регистриран от друга организация." };
    return { error: "Неуспешно записване. Опитай отново." };
  }
  if (!data || data.length === 0) {
    return { error: "Само собственик или администратор може да променя настройките." };
  }

  revalidatePath(`/dashboard/${orgSlug}`, "layout");
  return { message: "Запазено." };
}
