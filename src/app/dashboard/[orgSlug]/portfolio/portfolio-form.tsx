"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  ACTIVITY_LABEL,
  CLASSIFICATION_LABEL,
  OUTCOME_LABEL,
  OUTCOME_STYLE,
  RESULT_LABEL,
  RESULT_STYLE,
  formatDate,
} from "@/lib/mica/labels";
import { isOrgLevel, portfolioCsv, summarizePortfolio } from "@/lib/mica/portfolio";
import type { PortfolioState } from "./actions";

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

const EXAMPLE = "BTC, ETH, USDT, USDC, EURC, SOL, XRP, XMR";

/** „2 нарушения · 1 без данни“ — само ненулевите */
function countsText(c: { fail: number; evidence_required: number; upcoming: number }): string {
  const parts = [
    c.fail > 0 && `${c.fail} ${c.fail === 1 ? "нарушение" : "нарушения"}`,
    c.evidence_required > 0 && `${c.evidence_required} без данни`,
    c.upcoming > 0 && `${c.upcoming} ${c.upcoming === 1 ? "предстоящ срок" : "предстоящи срока"}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "без пропуски";
}

const fieldClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none";

export function PortfolioForm({
  action,
  orgSlug,
}: {
  action: (prev: PortfolioState, formData: FormData) => Promise<PortfolioState>;
  orgSlug: string;
}) {
  const [state, formAction, pending] = useActionState<PortfolioState, FormData>(action, {});
  // Полетата са контролирани: след изпращане React нулира неконтролираните полета на формата,
  // а списъкът трябва да остане, за да съвпада с таблицата под него.
  const [symbols, setSymbols] = useState(EXAMPLE);
  const [admission, setAdmission] = useState("");
  const [services, setServices] = useState<string[]>(["custody", "exchange_funds", "exchange_crypto", "transfer"]);
  const toggle = (s: string) => setServices((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const rows = state.rows ?? [];
  const summary = summarizePortfolio(rows);

  function downloadCsv() {
    const csv = portfolioCsv(rows, { result: RESULT_LABEL, classification: CLASSIFICATION_LABEL, outcome: OUTCOME_LABEL });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mica-guard-portfolio-${(state.evaluated_at ?? "").slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // Safari: не отменяй линка преди да започне свалянето
  }

  return (
    <div className="space-y-8">
      <form action={formAction} className="space-y-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <section>
          <label htmlFor="symbols" className="mb-1 block text-sm font-semibold uppercase tracking-wide text-slate-400">
            1. Токените, които предлагате
          </label>
          <p className="mb-2 text-xs text-slate-500">
            Постави символите — разделени със запетая, интервал или на нов ред. Може да копираш колона от Excel. До 100
            токена.
          </p>
          <textarea
            id="symbols"
            name="symbols"
            required
            rows={4}
            value={symbols}
            onChange={(e: { target: { value: string } }) => setSymbols(e.target.value)}
            className={`${fieldClass} font-mono text-sm`}
            spellCheck={false}
          />
        </section>

        <section>
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">2. Услугите ви</h3>
          <p className="mb-3 text-xs text-slate-500">Прилагат се към всички токени от списъка (чл. 3(1), т. 16).</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CASP_SERVICES.map((s) => (
              <label
                key={s}
                className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300 has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-950/40 has-[:checked]:text-white"
              >
                <input
                  type="checkbox"
                  name="services"
                  value={s}
                  checked={services.includes(s)}
                  onChange={() => toggle(s)}
                  className="mt-0.5"
                />
                {ACTIVITY_LABEL[s] ?? s}
              </label>
            ))}
          </div>
        </section>

        {services.includes("trading_platform") && (
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm text-slate-200">Кога са допуснати токените до търговия на платформата?</legend>
            {[
              ["", "Не знам / различно за различните токени"],
              ["before_mica", "Преди 30.12.2024 — преходен срок до 31.12.2027 (чл. 143(2))"],
              ["new", "След 30.12.2024"],
            ].map(([value, label]) => (
              <label key={value} className="flex items-start gap-2 text-sm text-slate-300">
                <input
                  type="radio"
                  name="admission"
                  value={value}
                  checked={admission === value}
                  onChange={() => setAdmission(value)}
                  className="mt-1"
                />
                {label}
              </label>
            ))}
          </fieldset>
        )}

        {state.error && (
          <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium hover:bg-emerald-500 disabled:opacity-60"
        >
          {pending ? "Проверявам…" : "Провери портфейла"}
        </button>
      </form>

      {state.rows && rows.length === 0 && (state.unknown?.length ?? 0) > 0 && (
        <p role="status" className="rounded-lg border border-amber-900 bg-amber-950/40 p-3 text-sm text-amber-200">
          Нито един от символите не е в каталога: {state.unknown!.join(", ")}. Пиши ни на team@micaguard.eu и ще ги
          добавим.
        </p>
      )}

      {state.rows && rows.length > 0 && (
        <section aria-labelledby="portfolio-result" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="portfolio-result" className="text-xl font-semibold">
                Резултат за {rows.length} {rows.length === 1 ? "токен" : "токена"}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {state.evaluated_at && `Изготвен ${formatDate(state.evaluated_at)}`}
                {state.register_as_of && ` · регистър на ESMA към ${formatDate(state.register_as_of)}`}
                {state.engine_version && ` · правила ${state.engine_version}`}
              </p>
            </div>
            {rows.length > 0 && (
              <button
                type="button"
                onClick={downloadCsv}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-slate-500"
              >
                Изтегли CSV (Excel)
              </button>
            )}
          </div>

          {(state.org_findings?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm">
              <p className="font-medium text-red-200">Лиценз на организацията — важи за всички токени</p>
              <ul className="mt-2 space-y-2">
                {state.org_findings!.map((f) => (
                  <li key={f.rule_code}>
                    <span className={`mr-2 rounded px-1.5 py-0.5 text-xs ${OUTCOME_STYLE[f.outcome]}`}>
                      {OUTCOME_LABEL[f.outcome]}
                    </span>
                    <span className="text-slate-100">{f.title}</span>
                    <span className="text-xs text-slate-400"> · {f.mica_reference}</span>
                    {f.remediation && <p className="mt-0.5 text-xs text-slate-400">{f.remediation}</p>}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">
                Данните за лиценза са от регистъра на ESMA по LEI от Настройки.
              </p>
            </div>
          )}

          {rows.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-sm">
              {(["non_compliant", "inconclusive", "partially_compliant", "compliant"] as const).map((k) => (
                <li key={k} className={`rounded-full px-3 py-1 ${RESULT_STYLE[k]}`}>
                  {RESULT_LABEL[k]}: {summary[k]}
                </li>
              ))}
            </ul>
          )}

          {rows.length > 0 && (
            <div className="relative overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Токен</th>
                    <th className="w-44 px-4 py-3 font-medium">Резултат</th>
                    <th className="px-4 py-3 font-medium">Основна констатация</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="sr-only">Действия</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((r) => (
                    <tr key={r.asset_id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.symbol}</p>
                        <p className="text-xs text-slate-400">
                          {r.name} · {CLASSIFICATION_LABEL[r.classification] ?? r.classification}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${RESULT_STYLE[r.result]}`}>
                          {RESULT_LABEL[r.result]}
                        </span>
                        <p className="mt-1 text-xs text-slate-500">{countsText(r.counts)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {r.top && isOrgLevel(r.top.rule_code) ? (
                          <span className="text-slate-400">
                            Няма пропуски за самия токен — виж лиценза над таблицата.
                          </span>
                        ) : r.top ? (
                          <>
                            <p>
                              <span className={`mr-2 rounded px-1.5 py-0.5 text-xs ${OUTCOME_STYLE[r.top.outcome]}`}>
                                {OUTCOME_LABEL[r.top.outcome]}
                              </span>
                              {r.top.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {r.top.mica_reference}
                              {r.top.remediation ? ` — ${r.top.remediation}` : ""}
                            </p>
                          </>
                        ) : (
                          <span className="text-slate-400">Няма открити пропуски</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/${orgSlug}/checks/new?asset=${r.asset_id}`}
                          className="whitespace-nowrap text-sm text-emerald-400 hover:text-emerald-300"
                        >
                          Пълна проверка →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(state.unknown?.length ?? 0) > 0 && (
            <p className="rounded-lg border border-amber-900 bg-amber-950/40 p-3 text-sm text-amber-200">
              Не са в каталога ({state.unknown!.length}): {state.unknown!.join(", ")}. Пиши ни на team@micaguard.eu и ще
              ги добавим.
            </p>
          )}
          {(state.invalid?.length ?? 0) > 0 && (
            <p className="text-xs text-slate-500">Пропуснати (невалиден символ): {state.invalid!.join(", ")}</p>
          )}
          {state.truncated && <p className="text-xs text-slate-500">Проверени са първите 100 токена.</p>}

          <p className="text-xs text-slate-500">
            Прегледът не се записва и не изразходва месечния лимит. „Нужни са данни“ означава, че за точна оценка са
            нужни ваши отговори — пусни пълна проверка за токена и ще получиш PDF доклад с контролна сума. Автоматизирана
            предварителна оценка по MiCA, не е правен съвет.
          </p>
        </section>
      )}
    </div>
  );
}
