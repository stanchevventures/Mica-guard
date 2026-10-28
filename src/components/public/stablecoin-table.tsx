"use client";

import { useState } from "react";
import type { StablecoinResult, StablecoinStatus } from "@/lib/esma/stablecoins";

type TableLabels = {
  search: string;
  searchPlaceholder: string;
  cols: { token: string; issuer: string; status: string; evidence: string };
  status: Record<StablecoinStatus, string>;
  evidence: {
    whitepaper: string;
    notFound: string;
    check: string;
    ended: string;
    authority: string;
  };
  empty: string;
  shown: (n: number, total: number) => string;
};

const LABELS: Record<"bg" | "en", TableLabels> = {
  bg: {
    search: "Търсене на стейбълкойн",
    searchPlaceholder: "Търси по символ, име или емитент",
    cols: { token: "Токен", issuer: "Емитент", status: "Статус", evidence: "Доказателство" },
    status: { authorised: "Вписан в ESMA", check: "Провери", ended: "Прекратен", not_found: "Не е в регистъра" },
    evidence: {
      whitepaper: "Бяла книга",
      notFound: "Емитентът не е открит в регистъра на ESMA.",
      check: "Има запис в регистъра, но бялата книга на токена не е разпозната автоматично.",
      ended: "Записът е прекратен на",
      authority: "Надзорен орган",
    },
    empty: "Няма стейбълкойн с това име в списъка. Виж всички емитенти в регистъра по-долу.",
    shown: (n, total) => (n === total ? `${total} стейбълкойна` : `${n} от ${total}`),
  },
  en: {
    search: "Search stablecoins",
    searchPlaceholder: "Search by symbol, name or issuer",
    cols: { token: "Token", issuer: "Issuer", status: "Status", evidence: "Evidence" },
    status: { authorised: "Listed with ESMA", check: "Check", ended: "Ended", not_found: "Not in register" },
    evidence: {
      whitepaper: "White paper",
      notFound: "The issuer is not in the ESMA register.",
      check: "There is a register entry, but the token's white paper was not matched automatically.",
      ended: "Entry ended on",
      authority: "Supervisor",
    },
    empty: "No stablecoin by that name in the list. See all issuers in the register below.",
    shown: (n, total) => (n === total ? `${total} stablecoins` : `${n} of ${total}`),
  },
};

function fmt(iso: string | null, lang: "bg" | "en"): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (lang === "bg") return `${d}.${m}.${y}`;
  // Без toLocaleDateString: сървърът и браузърът могат да имат различни данни за езика
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function StablecoinTable({
  results,
  lang,
}: {
  results: StablecoinResult[];
  lang: "bg" | "en";
}) {
  const labels = LABELS[lang];
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? results.filter((r) =>
        [r.symbol, r.name, r.issuer, r.currency, r.register?.name ?? ""].some((v) => v.toLowerCase().includes(needle))
      )
    : results;

  return (
    <>
      <div className="sc-toolbar">
        <label className="sr-only" htmlFor="sc-search">
          {labels.search}
        </label>
        <input
          id="sc-search"
          className="sc-search"
          type="search"
          value={q}
          onChange={(e: { target: { value: string } }) => setQ(e.target.value)}
          placeholder={labels.searchPlaceholder}
          autoComplete="off"
        />
        <p className="sc-legend" aria-live="polite">
          {labels.shown(shown.length, results.length)}
        </p>
      </div>

      <div className="sc-table-wrap">
        <table className="sc-table">
          <thead>
            <tr>
              <th scope="col">{labels.cols.token}</th>
              <th scope="col">{labels.cols.issuer}</th>
              <th scope="col">{labels.cols.status}</th>
              <th scope="col">{labels.cols.evidence}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.symbol}>
                <td>
                  <span className="sc-sym">{r.symbol}</span>
                  <span className="sc-sub">
                    {r.name} · {r.currency}
                  </span>
                </td>
                <td>
                  {r.register?.name ?? r.issuer}
                  {r.register && (
                    <span className="sc-sub">
                      {[r.register.country, r.register.authority].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </td>
                <td>
                  <span className={`sc-status sc-${r.status}`}>{labels.status[r.status]}</span>
                </td>
                <td>
                  {r.status === "authorised" && r.register?.whitepaper_url ? (
                    <>
                      <a href={r.register.whitepaper_url} target="_blank" rel="noopener noreferrer">
                        {labels.evidence.whitepaper}
                      </a>
                      {r.register.whitepaper_date && (
                        <span className="sc-sub">{fmt(r.register.whitepaper_date, lang)}</span>
                      )}
                    </>
                  ) : r.status === "ended" ? (
                    `${labels.evidence.ended} ${fmt(r.register?.ended_on ?? null, lang)}`
                  ) : r.status === "check" ? (
                    labels.evidence.check
                  ) : (
                    labels.evidence.notFound
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={4} className="sc-empty">
                  {labels.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
