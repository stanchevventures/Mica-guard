"use client";

import { useActionState, useState } from "react";
import type { CheckState } from "./actions";

export type FormAsset = {
  id: string;
  symbol: string;
  name: string;
  blockchain: string;
  mica_classification: string;
  identifiable_issuer: boolean | null;
  issuer_name: string | null;
  issuer_authorisation: string | null;
  anonymisation_function: boolean;
  whitepaper_url: string | null;
  whitepaper_notified_at: string | null;
};

type Tri = "yes" | "no" | "unknown";

const CASP_SERVICES = [
  "custody",
  "trading_platform",
  "exchange_funds",
  "exchange_crypto",
  "execution",
  "placing",
  "rto",
  "advice",
  "portfolio",
  "transfer",
];
const LINK_SERVICES = ["trading_platform", "exchange_funds", "exchange_crypto", "advice", "portfolio"];

const fieldClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none";

export function CheckForm({
  action,
  assets,
  classificationLabels,
  activityLabels,
}: {
  action: (prev: CheckState, formData: FormData) => Promise<CheckState>;
  assets: FormAsset[];
  classificationLabels: Record<string, string>;
  activityLabels: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState<CheckState, FormData>(action, {});
  const [assetId, setAssetId] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [issuer, setIssuer] = useState<Tri | "">("");
  const [whitepaper, setWhitepaper] = useState<Tri | "">("");

  const asset = assets.find((a) => a.id === assetId);
  const has = (s: string) => services.includes(s);
  const toggle = (s: string) =>
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  // ---- Кои въпроси са приложими (същата логика като в двигателя) ----
  const cls = asset?.mica_classification;
  const stable = cls === "emt" || cls === "art";
  const other = cls === "other_crypto_asset";
  const tp = has("trading_platform");
  const offering = has("offer_to_public");
  const linkService = services.some((s) => LINK_SERVICES.includes(s));
  const nonCompliantStable = stable && asset?.issuer_authorisation === "none";

  const askIssuer = !!asset && other && asset.identifiable_issuer === null && (tp || offering || linkService);
  const titleTwoApplies =
    other && (asset?.identifiable_issuer === true || (asset?.identifiable_issuer === null && issuer !== "no"));
  const issuerless =
    other && (asset?.identifiable_issuer === false || (asset?.identifiable_issuer === null && issuer === "no"));
  // Без емитент бяла книга не се изисква, но обменът/съветите/портфейлът дават линк
  // към всяка регистрирана бяла книга (чл. 66(3); ESMA Q&A 2654)
  const issuerlessLink =
    issuerless && services.some((s) => LINK_SERVICES.includes(s) && s !== "trading_platform");
  const wpRelevant =
    !!asset &&
    ((stable && !nonCompliantStable && services.length > 0) ||
      (titleTwoApplies && (tp || offering || linkService)) ||
      issuerlessLink);
  const catalogWp = !!asset?.whitepaper_url;
  const askWhitepaper = wpRelevant && !catalogWp;
  const askAdmission = tp && titleTwoApplies;
  const askSuitability = tp && !!asset;
  const askHolders = tp && !!asset?.anonymisation_function;
  const askConsent = stable && !nonCompliantStable && (tp || offering);
  const anyQuestion = askIssuer || askWhitepaper || askAdmission || askSuitability || askHolders || askConsent;

  return (
    <form action={formAction} className="space-y-8">
      {/* ---------------- 1. Актив ---------------- */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">1. Криптоактив</h3>
        <select
          name="asset_id"
          required
          value={assetId}
          onChange={(e: { target: { value: string } }) => {
            setAssetId(e.target.value);
            setIssuer("");
            setWhitepaper("");
          }}
          className={fieldClass}
        >
          <option value="" disabled>Избери актив…</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.symbol} — {a.name} ({a.blockchain})
            </option>
          ))}
        </select>

        {asset && (
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 rounded-lg bg-slate-950/60 p-3 text-xs text-slate-400 sm:grid-cols-2">
            <div>
              <dt className="inline">Класификация: </dt>
              <dd className="inline text-slate-200">
                {classificationLabels[asset.mica_classification] ?? asset.mica_classification}
              </dd>
            </div>
            <div>
              <dt className="inline">Емитент: </dt>
              <dd className="inline text-slate-200">
                {asset.identifiable_issuer === false
                  ? "няма идентифицируем"
                  : asset.issuer_name ?? (asset.identifiable_issuer === null ? "изисква преценка" : "—")}
              </dd>
            </div>
            {catalogWp && (
              <div className="sm:col-span-2">
                <dt className="inline">Бяла книга: </dt>
                <dd className="inline text-slate-200">
                  {asset.whitepaper_url}
                  {asset.whitepaper_notified_at ? ` (нотифицирана ${asset.whitepaper_notified_at})` : ""}
                </dd>
              </div>
            )}
            {asset.anonymisation_function && (
              <div className="sm:col-span-2 text-amber-300">Вградена функция за анонимизиране (чл. 76(3))</div>
            )}
          </dl>
        )}

        {nonCompliantStable && (
          <p className="mt-3 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
            Емитентът на този токен няма лиценз в ЕС. Според становището на ESMA от 08.10.2026 доставчиците не
            следва да предоставят услуги с него; останалите позиции трябва да бъдат уредени най-късно до 08.01.2027.
          </p>
        )}
      </section>

      {/* ---------------- 2. Услуги ---------------- */}
      <section>
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
          2. Какви услуги предоставяте за този актив?
        </h3>
        <p className="mb-3 text-xs text-slate-500">Услуги за криптоактиви по чл. 3(1), т. 16. Избери всички приложими.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CASP_SERVICES.map((s) => (
            <Check key={s} value={s} checked={has(s)} onChange={() => toggle(s)} label={activityLabels[s] ?? s} />
          ))}
        </div>
        <div className="mt-3 border-t border-slate-800 pt-3">
          <Check
            value="offer_to_public"
            checked={offering}
            onChange={() => toggle("offer_to_public")}
            label={activityLabels.offer_to_public}
          />
        </div>
      </section>

      {/* ---------------- 3. Въпроси ---------------- */}
      {anyQuestion && (
        <section className="space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">3. Данни за оценката</h3>

          {askIssuer && (
            <TriQuestion
              name="identifiable_issuer"
              label="Има ли активът идентифицируем емитент?"
              help="Напр. Bitcoin няма. Ако има юридическо лице, фондация или известен екип, който издава или контролира актива — има. От това зависи дали се изисква бяла книга (съображение 22; ESMA Q&A 2552)."
              value={issuer}
              onChange={setIssuer}
            />
          )}

          {askAdmission && (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm text-slate-200">Как е допуснат активът до търговия?</legend>
              {[
                ["new", "Ново допускане (след 30.12.2024)"],
                ["before_mica", "Допуснат преди 30.12.2024 — преходен срок до 31.12.2027 (чл. 143(2))"],
                ["elsewhere_consent", "Вече е допуснат на друга платформа в ЕС и имаме писмено съгласие от автора на бялата книга (чл. 5(4))"],
              ].map(([value, label]) => (
                <label key={value} className="flex items-start gap-2 text-sm text-slate-300">
                  <input type="radio" name="admission" value={value} defaultChecked={value === "new"} className="mt-1" />
                  {label}
                </label>
              ))}
            </fieldset>
          )}

          {askWhitepaper && (
            <div className="space-y-3">
              <TriQuestion
                name="whitepaper"
                label={
                  issuerless
                    ? "Има ли регистрирана бяла книга за актива (напр. доброволно нотифицирана)?"
                    : "Има ли публикувана бяла книга за актива?"
                }
                help={
                  stable
                    ? "За EMT/ART бялата книга се публикува от емитента."
                    : issuerless
                      ? "За актив без идентифицируем емитент бяла книга не е задължителна, но ако в регистъра на ESMA има такава, при обмен, съвети и управление на портфейл клиентите трябва да получат линк към нея (чл. 66(3); ESMA Q&A 2654)."
                      : undefined
                }
                value={whitepaper}
                onChange={setWhitepaper}
              />
              {whitepaper === "yes" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Линк към бялата книга</label>
                    <input name="whitepaper_url" type="url" required placeholder="https://…" className={fieldClass} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">
                      Дата на нотифициране/одобрение <span className="text-slate-500">(ако е известна)</span>
                    </label>
                    <input name="whitepaper_notified_at" type="date" className={fieldClass} />
                  </div>
                </div>
              )}
            </div>
          )}

          {askConsent && (
            <TriQuestion
              name="issuer_consent"
              label="Имате ли писмено съгласие от емитента да листвате/предлагате токена?"
              help="Изисква се по чл. 48(1), ал. 2 (EMT) или чл. 16(1), ал. 2 (ART), когато допускате или предлагате токена по своя инициатива. Не е нужно, ако допускането е поискано от самия емитент или вие сте емитентът (ESMA Q&A 2404)."
            />
          )}

          {askSuitability && (
            <TriQuestion
              name="suitability_documented"
              label="Има ли документирана оценка на пригодността на актива преди допускането му?"
              help="Чл. 76(2): надеждност на техническите решения, връзка с незаконни или измамни дейности, опит и репутация на емитента и екипа."
            />
          )}

          {askHolders && (
            <TriQuestion
              name="holders_identifiable"
              label="Можете ли да идентифицирате притежателите и историята на транзакциите им?"
              help="Чл. 76(3): активи с вградена функция за анонимизиране не се допускат до търговия, освен ако това е възможно."
            />
          )}
        </section>
      )}

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Проверката се изпълнява…" : "Пусни проверка"}
      </button>
    </form>
  );
}

function Check({
  value,
  checked,
  onChange,
  label,
}: {
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
        checked ? "border-emerald-700 bg-emerald-950/40 text-white" : "border-slate-800 text-slate-300 hover:border-slate-700"
      }`}
    >
      <input type="checkbox" name="services" value={value} checked={checked} onChange={onChange} className="mt-0.5" />
      {label}
    </label>
  );
}

function TriQuestion({
  name,
  label,
  help,
  value,
  onChange,
}: {
  name: string;
  label: string;
  help?: string;
  value?: Tri | "";
  onChange?: (v: Tri) => void;
}) {
  const options: [Tri, string][] = [
    ["yes", "Да"],
    ["no", "Не"],
    ["unknown", "Не знам"],
  ];
  return (
    <fieldset>
      <legend className="text-sm text-slate-200">{label}</legend>
      {help && <p className="mt-0.5 text-xs text-slate-500">{help}</p>}
      <div className="mt-2 flex gap-2">
        {options.map(([v, text]) => (
          <label
            key={v}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-sm text-slate-300 has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-950/40 has-[:checked]:text-white"
          >
            <input
              type="radio"
              name={name}
              value={v}
              required
              {...(onChange
                ? { checked: value === v, onChange: () => onChange(v) }
                : {})}
            />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
