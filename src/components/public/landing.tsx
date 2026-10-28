import Link from "next/link";
import { PUBLIC_PAGES, PublicShell, type Lang } from "./shell";

// Начална страница на български и английски. Статична: без заявки към базата и без дати при зареждане.

type Row = { ref: string; outcome: "fail" | "pass"; label: string; text: string };
type Copy = {
  h1: string;
  lead: string;
  ctaSignup: string;
  ctaLogin: string;
  note: string;
  sampleAria: string;
  sampleAsset: string;
  sampleService: string;
  sampleBadge: string;
  sample: Row[];
  sampleCaption: string;
  scTitle: string;
  scText: string;
  scLink: string;
  checksTitle: string;
  checks: { ref: string; title: string; text: string }[];
  howTitle: string;
  steps: string[];
  deadlinesTitle: string;
  deadlines: { date: string; text: string; past: boolean }[];
  expired: string;
  whoTitle: string;
  who: { strong: string; text: string }[];
  pilot: string;
  appLanguage?: string;
};

const COPY: Record<Lang, Copy> = {
  bg: {
    h1: "Може ли да предлагате този токен в ЕС?",
    lead: "MiCA-Guard проверява криптоактива и услугите ви по Регламент (ЕС) 2023/1114, сверява лиценза и емитента с регистъра на ESMA и дава отговор с член, източник и срок.",
    ctaSignup: "Създай безплатен профил",
    ctaLogin: "Вече имам профил",
    note: "10 проверки на месец без заплащане. Регистърът на ESMA се обновява всеки ден.",
    sampleAria: "Пример за резултат от проверка",
    sampleAsset: "USDT — Tether USD",
    sampleService: "Попечителство и администриране от името на клиенти",
    sampleBadge: "Не съответства",
    sample: [
      { ref: "чл. 48(1)(а)", outcome: "fail", label: "Нарушение", text: "Емитентът няма лиценз в ЕС. Токенът не може да се предлага публично или да се допуска до търговия." },
      { ref: "чл. 66(1)", outcome: "fail", label: "Нарушение", text: "Становище на ESMA от 08.10.2026: услугите се прекратяват, а позициите се уреждат най-късно до 08.01.2027." },
      { ref: "чл. 59, 63", outcome: "pass", label: "Изпълнено", text: "Лицензът и услугата „попечителство“ са вписани в регистъра на ESMA." },
    ],
    sampleCaption: "Пример. Всяка констатация посочва източника си: регистър на ESMA, каталог или ваша декларация.",
    scTitle: "Безплатно: кои стейбълкойни отговарят на MiCA",
    scText: "USDT, USDC, EURC, FDUSD и още — сверени с регистъра на ESMA всеки ден, без регистрация.",
    scLink: "Отвори стейбълкойн чекъра",
    checksTitle: "Какво проверява",
    checks: [
      { ref: "чл. 59, 60, 63", title: "Лиценз и обхват на услугите", text: "Сверяваме LEI на фирмата с регистъра на ESMA: има ли лиценз или нотификация и вписана ли е всяка услуга, която предлагате." },
      { ref: "чл. 16, 48, 66(1)", title: "Стейбълкойни", text: "Лиценз на емитента в ЕС, нотифицирана бяла книга и становището на ESMA за токените, които не отговарят на MiCA." },
      { ref: "чл. 4, 5, 66(3), 143(2)", title: "Бели книги", text: "Кога е нужна бяла книга, кога стига линк към вписана бяла книга и кой срок важи за активите, допуснати преди 30.12.2024." },
      { ref: "чл. 76", title: "Платформи за търговия", text: "Оценка на пригодността преди допускане и активи с вградена функция за анонимизиране." },
    ],
    howTitle: "Как работи",
    steps: [
      "Избирате криптоактив или целия си списък с токени и услугите, които предлагате.",
      "MiCA-Guard прилага 29 правила и проверява лицензите и белите книги в регистъра на ESMA.",
      "Получавате резултат с член и източник за всяко изискване, препоръки и PDF доклад с контролна сума.",
    ],
    deadlinesTitle: "Сроковете, които следим",
    deadlines: [
      { date: "01.07.2026", text: "Край на преходния режим. Без лиценз услуги не се предоставят.", past: true },
      { date: "08.01.2027", text: "Най-късен срок за уреждане на позициите в неотговарящи стейбълкойни.", past: false },
      { date: "31.12.2027", text: "Бели книги за активите, допуснати до търговия преди 30.12.2024.", past: false },
    ],
    expired: " Срокът изтече.",
    whoTitle: "За кого е",
    who: [
      { strong: "Доставчици на услуги за криптоактиви", text: " — проверка преди всяка нова услуга или нов токен и доклад за одита." },
      { strong: "Юридически кантори и консултанти", text: " — бърза първоначална оценка за клиенти, които кандидатстват за лиценз." },
      { strong: "Банки и платежни институции", text: " — нотификация по чл. 60 и проверка на крипто контрагенти." },
    ],
    pilot: "Пишете ни за пилотен достъп",
  },
  en: {
    h1: "Can you offer this token in the EU?",
    lead: "MiCA-Guard checks a crypto-asset and your services against Regulation (EU) 2023/1114, verifies your licence and the issuer in the ESMA register, and answers with the article, the source and the deadline.",
    ctaSignup: "Create a free account",
    ctaLogin: "I already have an account",
    note: "10 checks a month for free. The ESMA register is refreshed every day.",
    sampleAria: "Sample check result",
    sampleAsset: "USDT — Tether USD",
    sampleService: "Custody and administration on behalf of clients",
    sampleBadge: "Non-compliant",
    sample: [
      { ref: "Art. 48(1)(a)", outcome: "fail", label: "Breach", text: "The issuer has no EU authorisation. The token cannot be offered to the public or admitted to trading." },
      { ref: "Art. 66(1)", outcome: "fail", label: "Breach", text: "ESMA opinion of 8 Oct 2026: services stop, and remaining positions are wound down by 8 Jan 2027 at the latest." },
      { ref: "Art. 59, 63", outcome: "pass", label: "Met", text: "The licence and the custody service are listed in the ESMA register." },
    ],
    sampleCaption: "Sample. Every finding names its source: the ESMA register, our catalogue or your declaration.",
    scTitle: "Free: which stablecoins are MiCA-compliant",
    scText: "USDT, USDC, EURC, FDUSD and more — matched against the ESMA register every day, no sign-up.",
    scLink: "Open the stablecoin checker",
    checksTitle: "What it checks",
    checks: [
      { ref: "Art. 59, 60, 63", title: "Licence and scope of services", text: "We match your company's LEI with the ESMA register: is there an authorisation or notification, and is every service you provide listed?" },
      { ref: "Art. 16, 48, 66(1)", title: "Stablecoins", text: "Issuer authorisation in the EU, a notified white paper, and the ESMA opinion on tokens that do not comply with MiCA." },
      { ref: "Art. 4, 5, 66(3), 143(2)", title: "White papers", text: "When a white paper is required, when a link to a registered one is enough, and which deadline applies to assets admitted before 30 Dec 2024." },
      { ref: "Art. 76", title: "Trading platforms", text: "Suitability assessment before admission, and assets with a built-in anonymisation function." },
    ],
    howTitle: "How it works",
    steps: [
      "Pick a crypto-asset or your whole token list, and the services you provide.",
      "MiCA-Guard applies 29 rules and checks licences and white papers in the ESMA register.",
      "You get a result with the article and source for every requirement, next steps, and a PDF report with a checksum.",
    ],
    deadlinesTitle: "Deadlines we track",
    deadlines: [
      { date: "1 Jul 2026", text: "End of the transitional period. No services without authorisation.", past: true },
      { date: "8 Jan 2027", text: "Latest date to wind down positions in non-compliant stablecoins.", past: false },
      { date: "31 Dec 2027", text: "White papers for assets admitted to trading before 30 Dec 2024.", past: false },
    ],
    expired: " Deadline passed.",
    whoTitle: "Who it is for",
    who: [
      { strong: "Crypto-asset service providers", text: " — a check before every new service or token, and a report for the audit file." },
      { strong: "Law firms and consultants", text: " — a fast first assessment for clients applying for authorisation." },
      { strong: "Banks and payment institutions", text: " — Art. 60 notification and screening of crypto counterparties." },
    ],
    pilot: "Write to us for pilot access",
    appLanguage: "The application is currently in Bulgarian; the English interface is on its way. Pilot clients get it first.",
  },
};

export function Landing({ lang }: { lang: Lang }) {
  const c = COPY[lang];
  return (
    <PublicShell lang={lang} page="home">
      <section className="lp-wrap lp-hero">
        <div className="lp-hero-text">
          <h1>{c.h1}</h1>
          <p className="lp-lead">{c.lead}</p>
          <div className="lp-actions">
            <Link href="/login?mode=signup" className="lp-btn">
              {c.ctaSignup}
            </Link>
            <Link href="/login" className="lp-link">
              {c.ctaLogin}
            </Link>
          </div>
          <p className="lp-note">{c.note}</p>
          {c.appLanguage && <p className="lp-note">{c.appLanguage}</p>}
        </div>

        <figure className="lp-sheet" aria-label={c.sampleAria}>
          <div className="lp-sheet-head">
            <div>
              <p className="lp-sheet-asset">{c.sampleAsset}</p>
              <p className="lp-sheet-meta">{c.sampleService}</p>
            </div>
            <span className="lp-badge lp-badge-fail">{c.sampleBadge}</span>
          </div>
          <ol className="lp-findings">
            {c.sample.map((r) => (
              <li key={r.ref} className="lp-finding">
                <span className="lp-ref">{r.ref}</span>
                <div>
                  <span className={`lp-outcome lp-outcome-${r.outcome}`}>{r.label}</span>
                  <p>{r.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <figcaption>{c.sampleCaption}</figcaption>
        </figure>
      </section>

      <section className="lp-wrap lp-section" aria-labelledby="stablecoins">
        <div className="sc-cta">
          <div>
            <h2 id="stablecoins">{c.scTitle}</h2>
            <p>{c.scText}</p>
          </div>
          <Link href={PUBLIC_PAGES.stablecoins[lang]} className="lp-btn">
            {c.scLink}
          </Link>
        </div>
      </section>

      <section className="lp-wrap lp-section" aria-labelledby="checks">
        <h2 id="checks">{c.checksTitle}</h2>
        <ul className="lp-checks">
          {c.checks.map((x) => (
            <li key={x.title} className="lp-check">
              <p className="lp-ref">{x.ref}</p>
              <div>
                <h3>{x.title}</h3>
                <p>{x.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="lp-wrap lp-section" aria-labelledby="how">
        <h2 id="how">{c.howTitle}</h2>
        <ol className="lp-steps">
          {c.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <section className="lp-wrap lp-section" aria-labelledby="deadlines">
        <h2 id="deadlines">{c.deadlinesTitle}</h2>
        <ol className="lp-timeline">
          {c.deadlines.map((d) => (
            <li key={d.date} className={d.past ? "lp-past" : undefined}>
              <span className="lp-date">{d.date}</span>
              <p>
                {d.text}
                {d.past ? c.expired : ""}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-wrap lp-section lp-who" aria-labelledby="who">
        <h2 id="who">{c.whoTitle}</h2>
        <ul>
          {c.who.map((w) => (
            <li key={w.strong}>
              <strong>{w.strong}</strong>
              {w.text}
            </li>
          ))}
        </ul>
        <div className="lp-actions">
          <Link href="/login?mode=signup" className="lp-btn">
            {c.ctaSignup}
          </Link>
          <a href="mailto:team@micaguard.eu" className="lp-link">
            {c.pilot}
          </a>
        </div>
      </section>
    </PublicShell>
  );
}
