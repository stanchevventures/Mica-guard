"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildRegisterEvidence, loadRegisterStatus, lookupCasp } from "@/lib/esma/lookup";
import {
  ACTIVITIES,
  ENGINE_VERSION,
  runMicaRules,
  type Activity,
  type Answers,
  type AssetFacts,
  type Finding,
  type OrgFacts,
} from "@/lib/mica/engine";
import {
  matchSymbols,
  orgFindings,
  parseSymbols,
  sortRows,
  topFinding,
  type PortfolioFinding,
  type PortfolioRow,
} from "@/lib/mica/portfolio";

export type PortfolioState = {
  error?: string;
  rows?: PortfolioRow[];
  /** Пропуски в лиценза на организацията — еднакви за всички токени, показват се над таблицата */
  org_findings?: PortfolioFinding[];
  unknown?: string[];
  invalid?: string[];
  truncated?: boolean;
  evaluated_at?: string;
  register_as_of?: string | null;
  engine_version?: string;
  services?: Activity[];
};

const schema = z.object({
  symbols: z.string().trim().min(1, "Въведи поне един символ").max(10_000, "Списъкът е твърде дълъг"),
  services: z
    .array(z.enum(ACTIVITIES as unknown as [Activity, ...Activity[]]))
    .min(1, "Избери поне една услуга"),
  admission: z.enum(["new", "before_mica", "elsewhere_consent"]).optional(),
});

const ASSET_COLUMNS =
  "id, symbol, name, blockchain, contract_address, mica_classification, identifiable_issuer, issuer_name, issuer_lei, issuer_authorisation, anonymisation_function, whitepaper_url, whitepaper_notified_at, is_significant";

/**
 * Прилага правилата към всеки токен от списъка. Резултатът не се записва и не харчи
 * месечния лимит — това е преглед. За доклад с контролна сума се пуска отделна проверка.
 */
export async function runPortfolio(orgSlug: string, _prev: PortfolioState, formData: FormData): Promise<PortfolioState> {
  const admission = formData.get("admission");
  const parsed = schema.safeParse({
    symbols: formData.get("symbols") ?? "",
    services: formData.getAll("services").filter((v): v is string => typeof v === "string" && v !== ""),
    admission: typeof admission === "string" && admission !== "" ? admission : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const { symbols, invalid, truncated } = parseSymbols(d.symbols);
  if (symbols.length === 0) return { error: "Не открих валидни символи. Пример: BTC, ETH, USDT", invalid };

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

  // Каталогът е малък (десетки записи) — зареждаме го целия и свързваме символите в паметта
  const { data: catalog, error: catalogError } = await supabase
    .from("crypto_assets")
    .select(ASSET_COLUMNS)
    .order("created_at");
  if (catalogError || !catalog) return { error: "Каталогът с активи не можа да бъде зареден." };

  type Asset = (typeof catalog)[number];
  const { matched, unknown } = matchSymbols(symbols, catalog as Asset[]);

  const evaluatedAt = new Date();
  const orgFacts: OrgFacts = { entity_type: org.entity_type, casp_license_number: org.casp_license_number, lei: org.lei };
  const answers: Answers = { activities: d.services, admission: d.admission };

  // Лицензът на организацията — веднъж за целия списък
  const status = await loadRegisterStatus(supabase).catch(() => ({}));
  const casp = org.lei ? await lookupCasp(supabase, org.lei, status).catch(() => null) : null;

  const evaluate = async (a: Asset): Promise<{ row: PortfolioRow; findings: Finding[] }> => {
    const facts: AssetFacts = {
      symbol: a.symbol,
      name: a.name,
      classification: a.mica_classification,
      identifiable_issuer: a.identifiable_issuer,
      issuer_name: a.issuer_name,
      issuer_authorisation: a.issuer_authorisation,
      anonymisation_function: a.anonymisation_function,
      whitepaper_url: a.whitepaper_url,
      whitepaper_notified_at: a.whitepaper_notified_at,
      is_significant: a.is_significant,
      issuer_lei: a.issuer_lei,
    };
    // Емитентът се търси в регистъра само за EMT/ART с известно LEI
    const stable = a.mica_classification === "emt" || a.mica_classification === "art";
    const issuerEvidence =
      stable && a.issuer_lei
        ? await buildRegisterEvidence(supabase, {
            orgLei: null,
            issuerLei: a.issuer_lei,
            classification: a.mica_classification,
            symbol: a.symbol,
          })
        : {};
    const out = runMicaRules(facts, orgFacts, answers, evaluatedAt, { ...issuerEvidence, ...(casp ? { casp } : {}) });
    const row: PortfolioRow = {
      asset_id: a.id,
      symbol: a.symbol,
      name: a.name,
      blockchain: a.blockchain,
      classification: out.classification,
      result: out.result,
      risk_score: Number(out.risk_score),
      counts: out.counts,
      top: topFinding(out.findings),
    };
    return { row, findings: out.findings };
  };

  let results: { row: PortfolioRow; findings: Finding[] }[];
  try {
    results = await Promise.all(matched.map(evaluate));
  } catch {
    return { error: "Проверката на портфейла не можа да бъде завършена. Опитай отново." };
  }

  const asOf = Object.values(status as Record<string, { last_success_at: string }>)
    .map((s) => s.last_success_at)
    .sort()
    .at(-1);

  return {
    rows: sortRows(results.map((r) => r.row)),
    org_findings: orgFindings(results.map((r) => r.findings)),
    unknown,
    invalid,
    truncated,
    evaluated_at: evaluatedAt.toISOString(),
    register_as_of: asOf ?? null,
    engine_version: ENGINE_VERSION,
    services: d.services,
  };
}

