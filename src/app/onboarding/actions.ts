"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type OrgState = { error?: string };

const ENTITY_TYPES = [
  "casp",
  "issuer",
  "credit_institution",
  "csd",
  "investment_firm",
  "emi",
  "fund_manager",
  "market_operator",
  "other",
] as const;

const orgSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Името трябва да е поне 2 символа")
    .max(200, "Името е твърде дълго"),
  entity_type: z.enum(ENTITY_TYPES, { message: "Избери тип на дейността" }),
  country_code: z
    .string()
    .regex(/^[A-Z]{2}$/, "Избери държава"),
});

// Българска кирилица -> латиница, за да получим адрес като "moyata-firma"
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
  р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
  ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya",
};

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .split("")
    .map((c) => TRANSLIT[c] ?? c)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // махаме ударения (é -> e)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return slug.length >= 2 ? slug : "org";
}

function randomSuffix(): string {
  return crypto.randomUUID().slice(0, 4);
}

export async function createOrganization(
  _prev: OrgState,
  formData: FormData
): Promise<OrgState> {
  const parsed = orgSchema.safeParse({
    name: formData.get("name"),
    entity_type: formData.get("entity_type"),
    country_code: formData.get("country_code"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const baseSlug = slugify(parsed.data.name);

  // Ако адресът е зает, опитваме с кратка добавка: "acme" -> "acme-x7k2"
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${randomSuffix()}`;

    const { error } = await supabase.from("organizations").insert({
      name: parsed.data.name,
      slug,
      entity_type: parsed.data.entity_type,
      country_code: parsed.data.country_code,
      created_by: user.id, // тригерът в базата те прави owner
    });

    if (!error) redirect("/dashboard");

    // MG001 = лимитът от 3 организации на потребител (миграция 0006)
    if (error.code === "MG001") {
      return { error: "Можеш да създадеш до 3 организации. За повече пиши на team@micaguard.eu." };
    }

    // 23505 = уникалността е нарушена (адресът вече съществува) -> пробваме пак
    if (error.code !== "23505") {
      return { error: "Неуспешно създаване на организация. Опитай отново." };
    }
  }

  return { error: "Не успяхме да генерираме уникален адрес. Пробвай с друго име." };
}
