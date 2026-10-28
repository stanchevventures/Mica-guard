import Link from "next/link";

// Начална страница. Статична: без заявки към базата и без дати, изчислени при зареждане.

type Row = { ref: string; outcome: "fail" | "pass"; label: string; text: string };

const SAMPLE: Row[] = [
  {
    ref: "чл. 48(1)(а)",
    outcome: "fail",
    label: "Нарушение",
    text: "Емитентът няма лиценз в ЕС. Токенът не може да се предлага публично или да се допуска до търговия.",
  },
  {
    ref: "чл. 66(1)",
    outcome: "fail",
    label: "Нарушение",
    text: "Становище на ESMA от 08.10.2026: услугите се прекратяват, а позициите се уреждат най-късно до 08.01.2027.",
  },
  {
    ref: "чл. 59, 63",
    outcome: "pass",
    label: "Изпълнено",
    text: "Лицензът и услугата „попечителство“ са вписани в регистъра на ESMA.",
  },
];

const CHECKS = [
  {
    ref: "чл. 59, 60, 63",
    title: "Лиценз и обхват на услугите",
    text: "Сверяваме LEI на фирмата с регистъра на ESMA: има ли лиценз или нотификация и вписана ли е всяка услуга, която предлагате.",
  },
  {
    ref: "чл. 16, 48, 66(1)",
    title: "Стейбълкойни",
    text: "Лиценз на емитента в ЕС, нотифицирана бяла книга и становището на ESMA за токените, които не отговарят на MiCA.",
  },
  {
    ref: "чл. 4, 5, 66(3), 143(2)",
    title: "Бели книги",
    text: "Кога е нужна бяла книга, кога стига линк към вписана бяла книга и кой срок важи за активите, допуснати преди 30.12.2024.",
  },
  {
    ref: "чл. 76",
    title: "Платформи за търговия",
    text: "Оценка на пригодността преди допускане и активи с вградена функция за анонимизиране.",
  },
];

const STEPS = [
  "Избирате криптоактив и услугите, които предлагате за него.",
  "MiCA-Guard прилага 29 правила и проверява лицензите и белите книги в регистъра на ESMA.",
  "Получавате резултат с член и източник за всяко изискване, препоръки и PDF доклад с контролна сума.",
];

const DEADLINES = [
  { date: "01.07.2026", text: "Край на преходния режим. Без лиценз услуги не се предоставят.", past: true },
  { date: "08.01.2027", text: "Най-късен срок за уреждане на позициите в неотговарящи стейбълкойни.", past: false },
  { date: "31.12.2027", text: "Бели книги за активите, допуснати до търговия преди 30.12.2024.", past: false },
];

export default function HomePage() {
  return (
    <div className="lp">
      <style>{CSS}</style>

      <header className="lp-wrap lp-nav">
        <Link href="/" className="lp-logo">
          MiCA-Guard
        </Link>
        <nav className="lp-nav-links" aria-label="Профил">
          <Link href="/login">Вход</Link>
          <Link href="/login?mode=signup" className="lp-btn lp-btn-small">
            Създай профил
          </Link>
        </nav>
      </header>

      <main>
        <section className="lp-wrap lp-hero">
          <div className="lp-hero-text">
            <h1>Може ли да предлагате този токен в ЕС?</h1>
            <p className="lp-lead">
              MiCA-Guard проверява криптоактива и услугите ви по Регламент (ЕС) 2023/1114, сверява лиценза и емитента с
              регистъра на ESMA и дава отговор с член, източник и срок.
            </p>
            <div className="lp-actions">
              <Link href="/login?mode=signup" className="lp-btn">
                Създай безплатен профил
              </Link>
              <Link href="/login" className="lp-link">
                Вече имам профил
              </Link>
            </div>
            <p className="lp-note">10 проверки на месец без заплащане. Регистърът на ESMA се обновява всеки ден.</p>
          </div>

          <figure className="lp-sheet" aria-label="Пример за резултат от проверка">
            <div className="lp-sheet-head">
              <div>
                <p className="lp-sheet-asset">USDT — Tether USD</p>
                <p className="lp-sheet-meta">Попечителство и администриране от името на клиенти</p>
              </div>
              <span className="lp-badge lp-badge-fail">Не съответства</span>
            </div>
            <ol className="lp-findings">
              {SAMPLE.map((r) => (
                <li key={r.ref} className="lp-finding">
                  <span className="lp-ref">{r.ref}</span>
                  <div>
                    <span className={`lp-outcome lp-outcome-${r.outcome}`}>{r.label}</span>
                    <p>{r.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <figcaption>Пример. Всяка констатация посочва източника си: регистър на ESMA, каталог или ваша декларация.</figcaption>
          </figure>
        </section>

        <section className="lp-wrap lp-section" aria-labelledby="checks">
          <h2 id="checks">Какво проверява</h2>
          <ul className="lp-checks">
            {CHECKS.map((c) => (
              <li key={c.title} className="lp-check">
                <p className="lp-ref">{c.ref}</p>
                <div>
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-wrap lp-section" aria-labelledby="how">
          <h2 id="how">Как работи</h2>
          <ol className="lp-steps">
            {STEPS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>

        <section className="lp-wrap lp-section" aria-labelledby="deadlines">
          <h2 id="deadlines">Сроковете, които следим</h2>
          <ol className="lp-timeline">
            {DEADLINES.map((d) => (
              <li key={d.date} className={d.past ? "lp-past" : undefined}>
                <span className="lp-date">{d.date}</span>
                <p>
                  {d.text}
                  {d.past ? " Срокът изтече." : ""}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-wrap lp-section lp-who" aria-labelledby="who">
          <h2 id="who">За кого е</h2>
          <ul>
            <li>
              <strong>Доставчици на услуги за криптоактиви</strong> — проверка преди всяка нова услуга или нов токен и
              доклад за одита.
            </li>
            <li>
              <strong>Юридически кантори и консултанти</strong> — бърза първоначална оценка за клиенти, които
              кандидатстват за лиценз.
            </li>
            <li>
              <strong>Банки и платежни институции</strong> — нотификация по чл. 60 и проверка на крипто контрагенти.
            </li>
          </ul>
          <div className="lp-actions">
            <Link href="/login?mode=signup" className="lp-btn">
              Създай безплатен профил
            </Link>
            <a href="mailto:team@micaguard.eu" className="lp-link">
              Пишете ни за пилотен достъп
            </a>
          </div>
        </section>
      </main>

      <footer className="lp-wrap lp-footer">
        <p>
          Автоматизирана предварителна оценка по Регламент (ЕС) 2023/1114 (MiCA) и насоките на ESMA. Не е правен съвет.
        </p>
        <p>
          © 2026 MiCA-Guard. <a href="mailto:team@micaguard.eu">team@micaguard.eu</a>
        </p>
      </footer>
    </div>
  );
}

const CSS = `
.lp { --paper:#F4F6F9; --sheet:#FFFFFF; --ink:#0F1B2D; --slate:#4A5A70; --rule:#D3DAE4;
  --action:#047857; --action-hover:#065F46; --fail:#B42318; --fail-bg:#FEF3F2; --pass:#067647; --pass-bg:#ECFDF3;
  background: var(--paper); color: var(--ink); min-height: 100vh; color-scheme: light;
  font-family: var(--font-plex-sans), ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 16px; line-height: 1.6; }
.lp *, .lp *::before, .lp *::after { box-sizing: border-box; }
:where(.lp) :where(h1, h2, h3, p, ol, ul, figure) { margin: 0; padding: 0; }
:where(.lp) a { color: inherit; }
.lp a:focus-visible { outline: 2px solid var(--action); outline-offset: 3px; border-radius: 4px; }
.lp-wrap { max-width: 1120px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }

.lp-nav { display: flex; align-items: center; justify-content: space-between; padding-top: 24px; padding-bottom: 24px; }
.lp-logo { font-family: var(--font-plex-serif), ui-serif, Georgia, serif; font-weight: 600; font-size: 22px; text-decoration: none; letter-spacing: -0.01em; }
.lp-nav-links { display: flex; align-items: center; gap: 24px; font-size: 15px; }
.lp-nav-links > a:first-child { text-decoration: none; color: var(--slate); }
.lp-nav-links > a:first-child:hover { color: var(--ink); }

.lp-btn { display: inline-block; background: var(--action); color: #FFFFFF; text-decoration: none;
  font-weight: 600; padding: 12px 20px; border-radius: 8px; }
.lp-btn:hover { background: var(--action-hover); }
.lp-btn-small { padding: 8px 14px; font-size: 15px; }
.lp-link { color: var(--ink); font-weight: 500; text-underline-offset: 4px; }
.lp-link:hover { color: var(--action); }

.lp-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 56px; align-items: start;
  padding-top: 48px; padding-bottom: 88px; }
.lp-hero h1 { font-family: var(--font-plex-serif), ui-serif, Georgia, serif; font-weight: 500;
  font-size: 46px; line-height: 1.12; letter-spacing: -0.015em; max-width: 16ch; text-wrap: balance; }
.lp-lead { margin-top: 24px; font-size: 18px; color: var(--slate); max-width: 52ch; }
.lp-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; margin-top: 32px; }
.lp-note { margin-top: 16px; font-size: 14px; color: var(--slate); }

.lp-sheet { background: var(--sheet); border: 1px solid var(--rule); border-radius: 10px; padding: 24px; }
.lp-sheet-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 8px 16px;
  padding-bottom: 16px; border-bottom: 1px solid var(--rule); }
.lp-sheet-asset { font-weight: 600; font-size: 18px; }
.lp-sheet-meta { font-size: 14px; color: var(--slate); }
.lp-badge { white-space: nowrap; font-size: 13px; font-weight: 600; padding: 4px 10px; border-radius: 999px; }
.lp-badge-fail { color: var(--fail); background: var(--fail-bg); }
.lp-findings { list-style: none; }
.lp-finding { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 16px; padding: 16px 0;
  border-bottom: 1px solid var(--rule); }
.lp-finding p { font-size: 15px; margin-top: 2px; }
.lp-ref { font-family: var(--font-plex-serif), ui-serif, Georgia, serif; font-size: 15px; color: var(--slate); }
.lp-outcome { font-size: 13px; font-weight: 600; }
.lp-outcome-fail { color: var(--fail); }
.lp-outcome-pass { color: var(--pass); }
.lp-sheet figcaption { margin-top: 16px; font-size: 13px; color: var(--slate); }

.lp-section { padding-top: 64px; padding-bottom: 64px; border-top: 1px solid var(--rule); }
.lp-section h2 { font-family: var(--font-plex-serif), ui-serif, Georgia, serif; font-weight: 500; font-size: 30px;
  line-height: 1.2; letter-spacing: -0.01em; margin-bottom: 32px; }

.lp-checks { list-style: none; border-top: 1px solid var(--rule); }
.lp-check { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 32px; padding: 22px 0;
  border-bottom: 1px solid var(--rule); }
.lp-check .lp-ref { padding-top: 2px; }
.lp-check h3 { font-size: 18px; font-weight: 600; line-height: 1.35; }
.lp-check h3 + p { margin-top: 6px; color: var(--slate); max-width: 64ch; }

.lp-steps { list-style: none; counter-reset: step; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; }
.lp-steps li { counter-increment: step; max-width: 34ch; }
.lp-steps li::before { content: counter(step); display: block; font-family: var(--font-plex-serif), ui-serif, Georgia, serif;
  font-size: 40px; line-height: 1; color: var(--action); margin-bottom: 12px; }

.lp-timeline { list-style: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0;
  border-top: 2px solid var(--ink); }
.lp-timeline li { padding: 20px 24px 0 0; position: relative; }
.lp-timeline li::before { content: ""; position: absolute; top: -7px; left: 0; width: 12px; height: 12px;
  border-radius: 50%; background: var(--ink); }
.lp-date { display: block; font-family: var(--font-plex-serif), ui-serif, Georgia, serif; font-size: 34px;
  line-height: 1.1; letter-spacing: -0.01em; margin-bottom: 8px; }
.lp-timeline p { color: var(--slate); max-width: 30ch; }
.lp-past .lp-date, .lp-past p { color: #8A97A8; }
.lp-timeline .lp-past::before { background: #8A97A8; }

.lp-who ul { list-style: none; display: grid; gap: 12px; max-width: 72ch; }
.lp-who .lp-actions { margin-top: 32px; }
.lp-who li { color: var(--slate); }
.lp-who strong { color: var(--ink); font-weight: 600; }

.lp-footer { border-top: 1px solid var(--rule); padding-top: 24px; padding-bottom: 40px; font-size: 13px; color: var(--slate);
  display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; }

@media (max-width: 900px) {
  .lp-hero { grid-template-columns: minmax(0, 1fr); gap: 40px; padding-top: 24px; padding-bottom: 56px; }
  .lp-hero h1 { font-size: 36px; }
  .lp-check { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .lp-steps, .lp-timeline { grid-template-columns: minmax(0, 1fr); gap: 28px; }
  .lp-timeline { border-top: 0; border-left: 2px solid var(--ink); padding-left: 20px; }
  .lp-timeline li { padding: 0; }
  .lp-timeline li::before { top: 8px; left: -27px; }
}
@media (max-width: 480px) {
  .lp-wrap { padding-left: 16px; padding-right: 16px; }
  .lp-hero h1 { font-size: 31px; }
  .lp-finding { grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .lp-nav-links { gap: 16px; }
}
`;
