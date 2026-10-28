"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildRegisterEvidence } from "@/lib/esma/lookup";
import {
  ACTIVITIES,
  ENGINE_VERSION,
  runMicaRules,
  type Activity,
  type Answers,
  type AssetFacts,
  type EngineOutput,
  type OrgFacts,
} from "@/lib/mica/engine";

export type CheckState = { error?: string };

const tri = z.enum(["yes", "no", "unknown"]).optional();

const httpsUrl = z
  .string()
  .trim()
  .url("Невалиден линк към бялата книга")
  .refine((v) => /^https?:\/\//i.test(v), "Линкът трябва да започва с https://");

const pastDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Невалидна дата")
  .refine((v) => new Date(`${v}T00:00:00Z`).getTime() <= Date.now(), "Датата не може да е в бъдещето");

const schema = z.object({
  asset_id: z.string().uuid("Избери актив"),
  services: z
    .array(z.enum(ACTIVITIES as unknown as [Activity, ...Activity[]]))
    .min(1, "Избери поне една услуга"),
  identifiable_issuer: tri,
  admission: z.enum(["new", "before_mica", "elsewhere_consent"]).optional(),
  whitepaper: tri,
  whitepaper_url: httpsUrl.optional(),
  whitepaper_notified_at: pastDate.optional(),
  suitability_documented: tri,
  holders_identifiable: tri,
  issuer_consent: tri,
});

/** Празно поле от формата -> undefined */
function field(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

export async function createCheck(
  orgSlug: string,
  _prev: CheckState,
  formData: FormData
): Promise<CheckState> {
  const parsed = schema.safeParse({
    asset_id: field(formData, "asset_id") ?? "",
    services: formData.getAll("services").filter((v): v is string => typeof v === "string"),
    identifiable_issuer: field(formData, "identifiable_issuer"),
    admission: field(formData, "admission"),
    whitepaper: field(formData, "whitepaper"),
    whitepaper_url: field(formData, "whitepaper_url"),
    whitepaper_notified_at: field(formData, "whitepaper_notified_at"),
    suitability_documented: field(formData, "suitability_documented"),
    holders_identifiable: field(formData, "holders_identifiable"),
    issuer_consent: field(formData, "issuer_consent"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  // Без service ключа резултатът не може да бъде записан — проверяваме навреме
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
    .select("id, entity_type, casp_license_number, lei")
    .eq("slug", orgSlug)
    .maybeSingle();
  if (!org) return { error: "Организацията не е намерена." };

  const [{ data: asset }, { data: ruleSet }] = await Promise.all([
    supabase
      .from("crypto_assets")
      .select(
        "symbol, name, blockchain, contract_address, mica_classification, identifiable_issuer, issuer_name, issuer_lei, issuer_authorisation, anonymisation_function, whitepaper_url, whitepaper_notified_at, is_significant"
      )
      .eq("id", d.asset_id)
      .maybeSingle(),
    supabase.from("rule_sets").select("id, version").eq("is_active", true).maybeSingle(),
  ]);
  if (!asset) return { error: "Активът не е намерен." };

  if (d.whitepaper === "yes" && !asset.whitepaper_url && !d.whitepaper_url) {
    return { error: "Въведи линк към бялата книга или избери „Не знам“." };
  }

  const assetFacts: AssetFacts = {
    symbol: asset.symbol,
    name: asset.name,
    classification: asset.mica_classification,
    identifiable_issuer: asset.identifiable_issuer,
    issuer_name: asset.issuer_name,
    issuer_authorisation: asset.issuer_authorisation,
    anonymisation_function: asset.anonymisation_function,
    whitepaper_url: asset.whitepaper_url,
    whitepaper_notified_at: asset.whitepaper_notified_at,
    is_significant: asset.is_significant,
    issuer_lei: asset.issuer_lei,
  };
  const orgFacts: OrgFacts = {
    entity_type: org.entity_type,
    casp_license_number: org.casp_license_number,
    lei: org.lei,
  };
  const answers: Answers = {
    activities: d.services,
    identifiable_issuer: d.identifiable_issuer,
    admission: d.admission,
    whitepaper: d.whitepaper,
    whitepaper_url: d.whitepaper === "yes" ? (d.whitepaper_url ?? null) : null,
    whitepaper_notified_at: d.whitepaper === "yes" ? (d.whitepaper_notified_at ?? null) : null,
    suitability_documented: d.suitability_documented,
    holders_identifiable: d.holders_identifiable,
    issuer_consent: d.issuer_consent,
  };
  const evaluatedAt = new Date();

  // Регистър на ESMA: лиценз на организацията (по LEI) и на емитента на EMT/ART
  const register = await buildRegisterEvidence(supabase, {
    orgLei: org.lei,
    issuerLei: asset.issuer_lei,
    classification: asset.mica_classification,
    symbol: asset.symbol,
  });

  // 1) Проверката се създава като потребителя: RLS проверява ролята, тригерът — квотата
  const { data: check, error: insertError } = await supabase
    .from("compliance_checks")
    .insert({
      organization_id: org.id,
      asset_id: d.asset_id,
      requested_by: user.id,
      rule_set_id: ruleSet?.id ?? null,
      input_snapshot: {
        engine_version: ENGINE_VERSION,
        rule_set_version: ruleSet?.version ?? null,
        evaluated_at: evaluatedAt.toISOString(),
        asset: { ...assetFacts, blockchain: asset.blockchain, contract_address: asset.contract_address },
        org: orgFacts,
        answers,
        register,
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

  const fail = async (message: string) => {
    await admin
      .from("compliance_checks")
      .update({ status: "failed", error_message: message })
      .eq("id", check.id);
    return { error: "Проверката не можа да бъде завършена. Опитай отново." };
  };

  // 2) Правилата
  let out: EngineOutput;
  try {
    out = runMicaRules(assetFacts, orgFacts, answers, evaluatedAt, register);
  } catch (e) {
    return fail(`engine: ${(e as Error).message}`);
  }

  // 3) Резултатът се записва със service ключа — потребителят не може да го подправи
  const { error: findingsError } = await admin.from("check_findings").insert(
    out.findings.map((f) => ({
      check_id: check.id,
      rule_code: f.rule_code,
      mica_reference: f.mica_reference,
      title: f.title,
      outcome: f.outcome,
      passed: f.passed,
      severity: f.severity,
      details: f.details,
      remediation: f.remediation,
      evidence: f.evidence,
    }))
  );
  if (findingsError) return fail(`findings: ${findingsError.message}`);

  const { error: updateError } = await admin
    .from("compliance_checks")
    .update({
      status: "completed",
      result: out.result,
      risk_score: out.risk_score,
      classification_result: out.classification,
      summary: `Нарушения: ${out.counts.fail} · Нужни данни: ${out.counts.evidence_required} · Предстоящи: ${out.counts.upcoming}`,
      started_at: evaluatedAt.toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq("id", check.id);
  if (updateError) return fail(`update: ${updateError.message}`);

  redirect(`/dashboard/${orgSlug}/checks/${check.id}`);
}
