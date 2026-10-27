"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runMicaRules, type AssetInput } from "@/lib/mica/engine";

export type CheckState = { error?: string };

const schema = z.object({
  asset_id: z.string().uuid("Избери актив"),
  whitepaper_url: z.union([
    z.literal(""),
    z.string().trim().url("Невалиден линк към бяла книга"),
  ]),
  whitepaper_notified_at: z.union([
    z.literal(""),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Невалидна дата"),
  ]),
});

export async function createCheck(
  orgSlug: string,
  _prev: CheckState,
  formData: FormData
): Promise<CheckState> {
  const parsed = schema.safeParse({
    asset_id: formData.get("asset_id") ?? "",
    whitepaper_url: formData.get("whitepaper_url") ?? "",
    whitepaper_notified_at: formData.get("whitepaper_notified_at") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Без secret ключа не можем да запишем резултата — проверяваме навреме
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) return { error: "Организацията не е намерена." };

  const [{ data: asset }, { data: ruleSet }] = await Promise.all([
    supabase
      .from("crypto_assets")
      .select(
        "symbol, name, blockchain, contract_address, mica_classification, issuer_name, whitepaper_url, whitepaper_notified_at, is_significant"
      )
      .eq("id", parsed.data.asset_id)
      .maybeSingle(),
    supabase.from("rule_sets").select("id, version").eq("is_active", true).maybeSingle(),
  ]);
  if (!asset) return { error: "Активът не е намерен." };

  // Данните, въведени във формата, имат предимство пред каталога
  const input: AssetInput = {
    symbol: asset.symbol,
    name: asset.name,
    mica_classification: asset.mica_classification,
    issuer_name: asset.issuer_name,
    whitepaper_url: parsed.data.whitepaper_url || asset.whitepaper_url,
    whitepaper_notified_at:
      parsed.data.whitepaper_notified_at || asset.whitepaper_notified_at,
    is_significant: asset.is_significant,
  };

  // 1) Създаваме проверката като потребител (RLS проверява ролята, тригерът — квотата)
  const { data: check, error: insertError } = await supabase
    .from("compliance_checks")
    .insert({
      organization_id: org.id,
      asset_id: parsed.data.asset_id,
      requested_by: user.id,
      rule_set_id: ruleSet?.id ?? null,
      input_snapshot: {
        ...input,
        blockchain: asset.blockchain,
        contract_address: asset.contract_address,
        rule_set_version: ruleSet?.version ?? null,
      },
    })
    .select("id")
    .single();

  if (insertError || !check) {
    if (insertError?.code === "P0001") {
      return { error: "Изчерпан е месечният лимит от проверки за вашия план." };
    }
    if (insertError?.code === "42501") {
      return { error: "Нямаш права да пускаш проверки (нужна е роля Анализатор или по-висока)." };
    }
    return { error: "Неуспешно създаване на проверката." };
  }

  // 2) Изпълняваме правилата
  const out = runMicaRules(input);
  const now = new Date().toISOString();

  // 3) Записваме резултата със service ключа (потребителят не може да го подправи)
  const { error: findingsError } = await admin
    .from("check_findings")
    .insert(out.findings.map((f) => ({ ...f, check_id: check.id })));

  const { error: updateError } = findingsError
    ? { error: findingsError }
    : await admin
        .from("compliance_checks")
        .update({
          status: "completed",
          result: out.result,
          risk_score: out.risk_score,
          classification_result: out.classification,
          summary: `${out.findings.filter((f) => !f.passed).length} от ${out.findings.length} правила не са изпълнени.`,
          started_at: now,
          completed_at: now,
        })
        .eq("id", check.id);

  if (updateError) {
    await admin
      .from("compliance_checks")
      .update({ status: "failed", error_message: updateError.message })
      .eq("id", check.id);
    return { error: "Проверката не можа да бъде завършена. Опитай отново." };
  }

  redirect(`/dashboard/${orgSlug}/checks/${check.id}`);
}
