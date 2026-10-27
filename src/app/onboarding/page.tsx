"use client";

import { useActionState } from "react";
import { createOrganization, type OrgState } from "./actions";

const ENTITY_TYPES = [
  { value: "casp", label: "CASP — доставчик на крипто услуги" },
  { value: "issuer", label: "Емитент / оферент на криптоактиви" },
  { value: "credit_institution", label: "Кредитна институция" },
  { value: "emi", label: "Институция за електронни пари" },
  { value: "investment_firm", label: "Инвестиционен посредник" },
  { value: "other", label: "Друго" },
];

// Държави от ЕС/ЕИП, където се прилага MiCA
const COUNTRIES = [
  ["AT", "Австрия"], ["BE", "Белгия"], ["BG", "България"], ["HR", "Хърватия"],
  ["CY", "Кипър"], ["CZ", "Чехия"], ["DK", "Дания"], ["EE", "Естония"],
  ["FI", "Финландия"], ["FR", "Франция"], ["DE", "Германия"], ["GR", "Гърция"],
  ["HU", "Унгария"], ["IE", "Ирландия"], ["IT", "Италия"], ["LV", "Латвия"],
  ["LT", "Литва"], ["LU", "Люксембург"], ["MT", "Малта"], ["NL", "Нидерландия"],
  ["PL", "Полша"], ["PT", "Португалия"], ["RO", "Румъния"], ["SK", "Словакия"],
  ["SI", "Словения"], ["ES", "Испания"], ["SE", "Швеция"],
  ["IS", "Исландия"], ["LI", "Лихтенщайн"], ["NO", "Норвегия"],
];

const fieldClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none";

export default function OnboardingPage() {
  const [state, action, pending] = useActionState<OrgState, FormData>(
    createOrganization,
    {}
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-white">Създай организация</h1>
        <p className="mt-1 text-sm text-slate-400">
          Всички проверки и активи в MiCA-Guard принадлежат на организация.
          Ще бъдеш неин собственик (owner).
        </p>

        <form action={action} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Име на фирмата</label>
            <input name="name" required placeholder="напр. Acme Crypto AD" className={fieldClass} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Тип на дейността</label>
            <select name="entity_type" required defaultValue="" className={fieldClass}>
              <option value="" disabled>Избери…</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Държава на регистрация</label>
            <select name="country_code" required defaultValue="BG" className={fieldClass}>
              {COUNTRIES.map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          {state.error && <p className="text-sm text-red-400">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? "Създаване…" : "Създай организация"}
          </button>
        </form>
      </div>
    </main>
  );
}
