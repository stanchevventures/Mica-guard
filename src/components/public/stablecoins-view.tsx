import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { buildIssuerEntry, pickWhitepaper, type RegisterIssuerEntry } from "@/lib/esma/register";
import { countWhitepapers, evaluateStablecoins } from "@/lib/esma/stablecoins";
import { KEY_DATES } from "@/lib/mica/engine";
import { PublicShell, type Lang } from "./shell";
import { StablecoinTable } from "./stablecoin-table";

// Публичен стейбълкойн чекър: статусът се изчислява при всяко зареждане от копието на регистъра на ESMA.

const DEADLINE = KEY_DATES.nonCompliantStablecoinDeadline.toISOString().slice(0, 10); // 2027-01-08

const SOFIA_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit" });
const sofiaToday = () => SOFIA_DAY.format(new Date());
const dayIndex = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmt(iso: string, lang: Lang): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return lang === "bg" ? `${d}.${m}.${y}` : `${Number(d)} ${MONTHS_EN[Number(m) - 1]} ${y}`;
}

const AUTH: Record<Lang, Record<string, string>> = {
  bg: { credit_institution: "Кредитна институция", emi: "Институция за е-пари", art_issuer: "Емитент на ART" },
  en: { credit_institution: "Credit institution", emi: "E-money institution", art_issuer: "ART issuer" },
};

const COPY = {
  bg: {
    h1: "Кои стейбълкойни отговарят на MiCA?",
    lead: "Проверка на известните стейбълкойни срещу регистъра на ESMA за емитенти на EMT и ART. Обновява се всеки ден, без регистрация.",
    daysLabel: (n: number) => (n === 1 ? "ден" : "дни"),
    countdown: (date: string) => (
      <>
        до <strong>{date}</strong> — най-късният срок, в който националните органи следва да изискат уреждане на
        позициите в неотговарящи на MiCA стейбълкойни (становище на ESMA от 08.10.2026).
      </>
    ),
    overdue: (date: string) => (
      <>
        Срокът <strong>{date}</strong> за уреждане на позициите в неотговарящи стейбълкойни е изтекъл.
      </>
    ),
    meta: (updated: string | null, issuers: number, papers: number) =>
      [
        updated ? `Регистър на ESMA: обновен ${updated}` : "Регистърът на ESMA още не е зареден",
        `${issuers} емитента на EMT/ART`,
        `${papers} бели книги`,
      ],
    note: "Регистърът на ESMA не съдържа символите на токените. Връзката токен → емитент се поддържа от MiCA-Guard, а статусът се изчислява от регистъра при всяко зареждане. Не е правен съвет.",
    whatTitle: "Какво означава „Не е в регистъра“",
    what: [
      {
        h: "Публично предлагане и листване",
        p: "Публично предлагане и допускане до търговия на EMT в ЕС е допустимо само от лицензиран емитент (чл. 48(1)). Листването на неотговарящи токени е забранено от 30.06.2024 (ESMA Q&A 2404).",
      },
      {
        h: "Останалите услуги",
        p: "Според становището на ESMA от 08.10.2026 доставчиците не следва да предоставят услуги за такива токени — обмен, нареждания, попечителство, прехвърляне. Позициите се уреждат най-късно до 08.01.2027.",
      },
      {
        h: "Какво да направите",
        p: "Спрете нови покупки и промотиране, уведомете клиентите, съгласувайте с надзорния орган плана за съществуващите позиции и го документирайте.",
      },
    ],
    issuersTitle: "Всички емитенти на EMT и ART в регистъра",
    issuersEmpty: "Регистърът още не е зареден.",
    paper: "Бяла книга",
    ctaTitle: "Проверете целия си списък с токени",
    ctaText: "Качете токените, които предлагате, и получете резултат по всеки: лиценз на емитента, бяла книга, срок и какво да направите. С доклад за одита.",
    ctaButton: "Създай безплатен профил",
    error: "Регистърът на ESMA временно не е достъпен. Опитай отново след малко.",
    loading: "Зареждане на регистъра…",
  },
  en: {
    h1: "Which stablecoins comply with MiCA?",
    lead: "Well-known stablecoins checked against the ESMA register of EMT and ART issuers. Refreshed every day, no sign-up.",
    daysLabel: (n: number) => (n === 1 ? "day" : "days"),
    countdown: (date: string) => (
      <>
        until <strong>{date}</strong> — the latest date by which national authorities should require positions in
        non-compliant stablecoins to be wound down (ESMA opinion of 8 Oct 2026).
      </>
    ),
    overdue: (date: string) => (
      <>
        The <strong>{date}</strong> deadline for winding down positions in non-compliant stablecoins has passed.
      </>
    ),
    meta: (updated: string | null, issuers: number, papers: number) =>
      [
        updated ? `ESMA register: updated ${updated}` : "The ESMA register has not been loaded yet",
        `${issuers} EMT/ART issuers`,
        `${papers} white papers`,
      ],
    note: "The ESMA register does not contain token symbols. MiCA-Guard maintains the token → issuer mapping; the status is computed from the register on every load. Not legal advice.",
    whatTitle: "What “Not in register” means",
    what: [
      {
        h: "Public offers and listing",
        p: "An EMT may be offered to the public or admitted to trading in the EU only by an authorised issuer (Art. 48(1)). Listing non-compliant tokens has been prohibited since 30 Jun 2024 (ESMA Q&A 2404).",
      },
      {
        h: "Other services",
        p: "Under the ESMA opinion of 8 Oct 2026, providers should not offer services for such tokens — exchange, order execution, custody, transfers. Positions are wound down by 8 Jan 2027 at the latest.",
      },
      {
        h: "What to do",
        p: "Stop new purchases and promotion, inform clients, agree a plan for existing positions with your supervisor, and document it.",
      },
    ],
    issuersTitle: "All EMT and ART issuers in the register",
    issuersEmpty: "The register has not been loaded yet.",
    paper: "White paper",
    ctaTitle: "Check your whole token list",
    ctaText: "Upload the tokens you offer and get a result for each one: issuer authorisation, white paper, deadline and next steps. With an audit-ready report.",
    ctaButton: "Create a free account",
    error: "The ESMA register is temporarily unavailable. Please try again shortly.",
    loading: "Loading the register…",
  },
} as const;

const ROW_COLUMNS =
  "register, lei, lei_name, commercial_name, home_member_state, competent_authority, legal_basis, services, issuer_authorisation, authorisation_date, authorisation_end_date, whitepaper_url, whitepaper_date, last_update";

type Row = Parameters<typeof buildIssuerEntry>[0][number] & { register: string };

export function StablecoinsPage({ lang }: { lang: Lang }) {
  return (
    <PublicShell lang={lang} page="stablecoins">
      <Suspense
        fallback={
          <section className="lp-wrap sc-hero">
            <p className="lp-lead">{COPY[lang].loading}</p>
          </section>
        }
      >
        <StablecoinsContent lang={lang} />
      </Suspense>
    </PublicShell>
  );
}

export async function StablecoinsContent({ lang }: { lang: Lang }) {
  await connection(); // данните и броят дни — при всяка заявка
  const c = COPY[lang];
  const today = sofiaToday();
  const days = dayIndex(DEADLINE) - dayIndex(today);

  let issuers: RegisterIssuerEntry[] = [];
  let updated: string | null = null;
  let failed = false;
  try {
    const supabase = createPublicClient();
    const [entries, status] = await Promise.all([
      supabase.from("esma_register_entries").select(ROW_COLUMNS).in("register", ["emt", "art"]).not("lei", "is", null),
      supabase.from("esma_register_status").select("register, last_success_at").in("register", ["emt", "art"]),
    ]);
    if (entries.error || status.error) throw new Error(entries.error?.message ?? status.error?.message);

    const groups = new Map<string, Row[]>();
    for (const r of (entries.data ?? []) as Row[]) {
      const key = `${r.register}:${r.lei}`;
      const list = groups.get(key);
      if (list) list.push(r);
      else groups.set(key, [r]);
    }
    issuers = [...groups.values()]
      .map((rows) => buildIssuerEntry(rows, today))
      .filter((e): e is RegisterIssuerEntry => e !== null)
      .sort((a, b) => (a.home_member_state ?? "").localeCompare(b.home_member_state ?? "") || a.name.localeCompare(b.name));
    const last = ((status.data ?? []) as { last_success_at: string }[]).map((s) => s.last_success_at).sort().at(-1);
    updated = last ? fmt(last, lang) : null;
  } catch {
    failed = true;
  }

  const results = evaluateStablecoins(issuers, pickWhitepaper);
  const papersOf = (e: RegisterIssuerEntry) => e.whitepapers.filter((w) => /^https?:\/\//i.test(w.url));

  return (
    <>
      <section className="lp-wrap sc-hero">
        <div>
          <h1>{c.h1}</h1>
          <p className="lp-lead">{c.lead}</p>
        </div>
        <div className="sc-countdown">
          {days >= 0 ? (
            <>
              <p className="sc-countdown-num">
                {days}
                <small>{c.daysLabel(days)}</small>
              </p>
              <p>{c.countdown(fmt(DEADLINE, lang))}</p>
            </>
          ) : (
            <p>{c.overdue(fmt(DEADLINE, lang))}</p>
          )}
        </div>
      </section>

      <section className="lp-wrap" aria-label={c.h1}>
        {failed ? (
          <p className="sc-error" role="alert">
            {c.error}
          </p>
        ) : (
          <>
            <p className="sc-meta">
              {c.meta(updated, issuers.length, countWhitepapers(issuers)).map((m) => (
                <span key={m}>{m}</span>
              ))}
            </p>
            <StablecoinTable results={results} lang={lang} />
            <p className="sc-note">{c.note}</p>
          </>
        )}
      </section>

      <section className="lp-wrap lp-section" style={{ marginTop: 56 }} aria-labelledby="sc-what">
        <h2 id="sc-what">{c.whatTitle}</h2>
        <ul className="sc-what">
          {c.what.map((w) => (
            <li key={w.h}>
              <h3>{w.h}</h3>
              <p>{w.p}</p>
            </li>
          ))}
        </ul>
      </section>

      {!failed && (
        <section className="lp-wrap lp-section" aria-labelledby="sc-issuers">
          <h2 id="sc-issuers">{c.issuersTitle}</h2>
          {issuers.length === 0 ? (
            <p className="lp-note">{c.issuersEmpty}</p>
          ) : (
            <ul className="sc-issuers">
              {issuers.map((e) => (
                <li key={`${e.lei}-${e.name}`}>
                  <div>
                    <strong>{e.name}</strong>
                    <span className="sc-sub">LEI {e.lei}</span>
                  </div>
                  <div>
                    {[e.home_member_state, e.authorisation ? AUTH[lang][e.authorisation] : null].filter(Boolean).join(" · ")}
                    {e.authority && <span className="sc-sub">{e.authority}</span>}
                  </div>
                  <div className="sc-papers">
                    {papersOf(e).map((w, i) => (
                      <a key={w.url} href={w.url} target="_blank" rel="noopener noreferrer">
                        {c.paper}
                        {papersOf(e).length > 1 ? ` ${i + 1}` : ""}
                        {w.notified_on ? ` · ${fmt(w.notified_on, lang)}` : ""}
                      </a>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="lp-wrap lp-section">
        <div className="sc-cta">
          <div>
            <h2>{c.ctaTitle}</h2>
            <p>{c.ctaText}</p>
          </div>
          <Link href="/login?mode=signup" className="lp-btn">
            {c.ctaButton}
          </Link>
        </div>
      </section>
    </>
  );
}
