// Стилове на публичните страници (начална страница, стейбълкойн чекър) — дизайнът на micaguard.eu:
// тъмен фон с решетка (от body в globals.css), „стъклени“ панели, синьо-циан градиенти, Inter.
export const PUBLIC_CSS = `
.lp { --ink:#F3F4F6; --slate:#9CA3AF; --rule:rgba(255,255,255,0.08); --rule-strong:rgba(255,255,255,0.14);
  --glass:rgba(17,24,39,0.72); --cyan:#06B6D4; --cyan-soft:#67E8F9;
  --grad:linear-gradient(90deg,#2563EB,#06B6D4); --glow:0 0 25px rgba(59,130,246,0.35);
  --fail:#F87171; --fail-bg:rgba(239,68,68,0.1); --fail-line:rgba(239,68,68,0.3);
  --pass:#34D399; --pass-bg:rgba(16,185,129,0.1); --pass-line:rgba(16,185,129,0.3);
  --warn:#FBBF24; --warn-bg:rgba(245,158,11,0.1); --warn-line:rgba(245,158,11,0.3);
  color: var(--ink); min-height: 100vh; color-scheme: dark;
  font-family: var(--font-inter), ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 16px; line-height: 1.6; }
.lp *, .lp *::before, .lp *::after { box-sizing: border-box; }
:where(.lp) :where(h1, h2, h3, p, ol, ul, figure) { margin: 0; padding: 0; }
:where(.lp) a { color: inherit; }
.lp a:focus-visible, .lp input:focus-visible { outline: 2px solid var(--cyan); outline-offset: 3px; border-radius: 6px; }
.lp-wrap { max-width: 1180px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }
.lp-glass { background: var(--glass); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid var(--rule); }

/* ---- горна лента ---- */
.lp-header { position: sticky; top: 0; z-index: 50; background: rgba(10,13,20,0.72);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border-bottom: 1px solid var(--rule); }
.lp-nav { display: flex; align-items: center; justify-content: space-between; gap: 20px; min-height: 76px; }
.lp-nav-links { display: flex; align-items: center; gap: 26px; font-size: 15px; }
.lp-nav-links .lp-navlink { text-decoration: none; color: #D1D5DB; font-weight: 500; }
.lp-nav-links .lp-navlink:hover, .lp-nav-links .lp-navlink[aria-current="page"] { color: var(--cyan-soft); }
.lp-lang { font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-decoration: none; color: var(--slate);
  border: 1px solid var(--rule-strong); border-radius: 10px; padding: 5px 11px; background: rgba(255,255,255,0.03); }
.lp-lang:hover { color: #fff; border-color: rgba(6,182,212,0.5); }

/* ---- бутони и линкове ---- */
.lp-btn { display: inline-block; background: var(--grad); color: #FFFFFF; text-decoration: none; box-shadow: var(--glow);
  font-weight: 700; font-size: 15.5px; padding: 14px 24px; border-radius: 12px; }
.lp-btn:hover { filter: brightness(1.1); }
.lp-btn-small { padding: 9px 16px; font-size: 14.5px; border-radius: 10px; }
.lp-link { color: var(--ink); font-weight: 600; text-underline-offset: 4px; }
.lp-link:hover { color: var(--cyan-soft); }

/* ---- начална страница ---- */
.lp-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: 56px; align-items: center;
  padding-top: 72px; padding-bottom: 88px; }
.lp-hero h1 { font-weight: 800; font-size: clamp(36px, 4.6vw, 54px); line-height: 1.08; letter-spacing: -0.03em;
  max-width: 15ch; color: #fff; text-wrap: balance; }
.lp[lang="bg"] .lp-hero h1 { max-width: 17ch; font-size: clamp(32px, 4.2vw, 50px); }
.lp-lead { margin-top: 24px; font-size: 19px; color: var(--slate); max-width: 36em; }
.lp-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; margin-top: 34px; }
.lp-note { margin-top: 16px; font-size: 14px; color: var(--slate); }

.lp-sheet { border-radius: 22px; padding: 24px; box-shadow: 0 30px 80px -30px rgba(0,0,0,0.8);
  background: var(--glass); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border: 1px solid var(--rule); }
.lp-sheet-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 8px 16px;
  padding-bottom: 16px; border-bottom: 1px solid var(--rule); }
.lp-sheet-asset { font-weight: 700; font-size: 18px; color: #fff; }
.lp-sheet-meta { font-size: 14px; color: var(--slate); }
.lp-badge { white-space: nowrap; font-size: 12.5px; font-weight: 600; padding: 3px 10px; border-radius: 999px; border: 1px solid; }
.lp-badge-fail { color: var(--fail); background: var(--fail-bg); border-color: var(--fail-line); }
.lp-findings { list-style: none; }
.lp-finding { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 16px; padding: 16px 0;
  border-bottom: 1px solid var(--rule); }
.lp-finding p { font-size: 15px; margin-top: 2px; color: #D1D5DB; }
.lp-ref { font-variant-numeric: tabular-nums; font-size: 14px; font-weight: 500; color: var(--slate); }
.lp-outcome { font-size: 12.5px; font-weight: 700; }
.lp-outcome-fail { color: var(--fail); }
.lp-outcome-pass { color: var(--pass); }
.lp-sheet figcaption { margin-top: 16px; font-size: 13px; color: var(--slate); }

.lp-section { padding-top: 88px; padding-bottom: 88px; border-top: 1px solid var(--rule); }
.lp-section h2 { font-weight: 800; font-size: clamp(28px, 3.2vw, 40px); line-height: 1.15; letter-spacing: -0.025em;
  margin-bottom: 36px; color: #fff; max-width: 24ch; }

.lp-checks { list-style: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.lp-check { padding: 26px; border-radius: 20px; border: 1px solid var(--rule);
  background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); }
.lp-check .lp-ref { margin-bottom: 8px; color: var(--cyan-soft); }
.lp-check h3 { font-size: 18px; font-weight: 700; line-height: 1.35; color: #fff; }
.lp-check h3 + p { margin-top: 6px; color: var(--slate); font-size: 15.5px; }

.lp-steps { list-style: none; counter-reset: step; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; }
.lp-steps li { counter-increment: step; color: var(--slate); }
.lp-steps li::before { content: counter(step); display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%;
  background: #111827; border: 2px solid var(--cyan); color: var(--cyan-soft); font-weight: 700; font-size: 15px; margin-bottom: 16px; }

.lp-timeline { list-style: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0;
  border-top: 2px solid rgba(6,182,212,0.45); }
.lp-timeline li { padding: 22px 24px 0 0; position: relative; }
.lp-timeline li::before { content: ""; position: absolute; top: -8px; left: 0; width: 14px; height: 14px;
  border-radius: 50%; background: var(--cyan); box-shadow: 0 0 14px rgba(6,182,212,0.7); }
.lp-date { display: block; font-weight: 800; font-size: 32px; line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 8px; color: #fff; }
.lp-timeline p { color: var(--slate); max-width: 30ch; }
.lp-past .lp-date, .lp-past p { color: #6B7280; }
.lp-timeline .lp-past::before { background: #4B5563; box-shadow: none; }

.lp-who ul { list-style: none; display: grid; gap: 12px; max-width: 72ch; }
.lp-who .lp-actions { margin-top: 32px; }
.lp-who li { color: var(--slate); }
.lp-who strong { color: #fff; font-weight: 600; }

.lp-footer { border-top: 1px solid var(--rule); padding-top: 28px; padding-bottom: 44px; font-size: 13.5px; color: #6B7280;
  display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; }
.lp-footer a { color: var(--slate); }

@media (max-width: 920px) {
  .lp-hero { grid-template-columns: minmax(0, 1fr); gap: 40px; padding-top: 40px; padding-bottom: 64px; }
  .lp-checks { grid-template-columns: minmax(0, 1fr); }
  .lp-steps, .lp-timeline { grid-template-columns: minmax(0, 1fr); gap: 28px; }
  .lp-timeline { border-top: 0; border-left: 2px solid rgba(6,182,212,0.45); padding-left: 22px; }
  .lp-timeline li { padding: 0; }
  .lp-timeline li::before { top: 10px; left: -30px; }
}
@media (max-width: 600px) {
  .lp-wrap { padding-left: 16px; padding-right: 16px; }
  .lp-section { padding-top: 64px; padding-bottom: 64px; }
  .lp-finding { grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .lp-nav { gap: 12px; min-height: 64px; }
  .lp-nav-links { gap: 12px; font-size: 14px; }
  .lp-nav-links .lp-hide-sm { display: none; }
  .lp-nav .lp-btn-small { padding: 8px 12px; font-size: 13.5px; white-space: nowrap; }
  .lp-sheet { padding: 18px; }
}

/* ---- стейбълкойн чекър ---- */
.sc-hero { padding-top: 56px; padding-bottom: 48px; display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 48px; align-items: end; }
.sc-hero h1 { font-weight: 800; font-size: clamp(32px, 4.2vw, 48px); line-height: 1.08; letter-spacing: -0.03em;
  max-width: 18ch; color: #fff; text-wrap: balance; }
.sc-countdown { border-radius: 20px; padding: 22px 26px; border: 1px solid var(--rule); border-left: 4px solid var(--fail);
  background: var(--glass); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.sc-countdown .sc-countdown-num { margin-top: 0; font-weight: 800; font-size: 60px; line-height: 1;
  letter-spacing: -0.03em; color: var(--fail); text-shadow: 0 0 30px rgba(248,113,113,0.35); }
.sc-countdown-num small { font-size: 18px; font-weight: 600; color: #fff; margin-left: 8px; letter-spacing: 0; text-shadow: none; }
.sc-countdown p { margin-top: 10px; font-size: 14px; color: var(--slate); }
.sc-countdown strong { color: #fff; }
.sc-meta { display: flex; flex-wrap: wrap; gap: 8px 24px; font-size: 14px; color: var(--slate); margin-bottom: 16px; }
.sc-search { width: 100%; max-width: 360px; font: inherit; font-size: 15px; padding: 11px 14px; border-radius: 12px;
  border: 1px solid var(--rule-strong); background: rgba(10,13,20,0.7); color: #fff; }
.sc-search::placeholder { color: #6B7280; }
.sc-search:focus { outline: 2px solid var(--cyan); outline-offset: 1px; border-color: var(--cyan); }
.sc-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.sc-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 13px; color: var(--slate); }
.sc-table-wrap { border-radius: 20px; overflow-x: auto; border: 1px solid var(--rule);
  background: var(--glass); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.sc-table { width: 100%; border-collapse: collapse; font-size: 15px; min-width: 720px; }
.sc-table th { text-align: left; font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
  color: var(--slate); padding: 13px 18px; border-bottom: 1px solid var(--rule); white-space: nowrap; background: rgba(255,255,255,0.02); }
.sc-table td { padding: 15px 18px; border-bottom: 1px solid var(--rule); vertical-align: top; color: #E5E7EB; }
.sc-table tr:last-child td { border-bottom: 0; }
.sc-sym { font-weight: 700; color: #fff; }
.sc-sub { display: block; font-size: 13px; color: var(--slate); }
.sc-table a { color: var(--cyan-soft); text-underline-offset: 3px; }
.sc-table a:hover { color: #A5F3FC; }
.sc-status { display: inline-block; white-space: nowrap; font-size: 12.5px; font-weight: 600; padding: 3px 10px; border-radius: 999px; border: 1px solid; }
.sc-authorised { color: var(--pass); background: var(--pass-bg); border-color: var(--pass-line); }
.sc-not_found, .sc-ended { color: var(--fail); background: var(--fail-bg); border-color: var(--fail-line); }
.sc-check { color: var(--warn); background: var(--warn-bg); border-color: var(--warn-line); }
.sc-empty { padding: 24px 18px; color: var(--slate); }
.sc-note { margin-top: 12px; font-size: 13px; color: var(--slate); max-width: 80ch; }
.sc-issuers { list-style: none; border-top: 1px solid var(--rule); }
.sc-issuers li { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.4fr); gap: 16px;
  padding: 15px 0; border-bottom: 1px solid var(--rule); font-size: 15px; color: #D1D5DB; }
.sc-issuers strong { color: #fff; }
.sc-papers { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 14px; }
.sc-papers a { color: var(--cyan-soft); text-underline-offset: 3px; }
.sc-what { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; list-style: none; }
.sc-what li { padding: 24px; border-radius: 20px; border: 1px solid var(--rule);
  background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); }
.sc-what h3 { font-size: 17px; font-weight: 700; line-height: 1.35; margin-bottom: 6px; color: #fff; }
.sc-what p { color: var(--slate); font-size: 15px; }
.sc-cta { border-radius: 24px; padding: 40px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 24px;
  border: 1px solid rgba(6,182,212,0.35); box-shadow: 0 0 40px rgba(6,182,212,0.12);
  background: var(--glass); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.sc-cta h2 { font-weight: 800; font-size: clamp(24px, 2.6vw, 32px); letter-spacing: -0.02em; margin: 0; color: #fff; }
.sc-cta p { color: var(--slate); margin-top: 8px; max-width: 60ch; }
.sc-error { background: var(--fail-bg); color: var(--fail); border: 1px solid var(--fail-line); border-radius: 14px; padding: 16px 20px; }

@media (max-width: 920px) {
  .sc-hero { grid-template-columns: minmax(0, 1fr); gap: 28px; padding-top: 32px; }
  .sc-issuers li { grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .sc-what { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 600px) {
  .sc-countdown .sc-countdown-num { font-size: 46px; }
  .sc-cta { padding: 28px 20px; }
}

/* Стейбълкойн таблицата като карти на телефон — статусът да се вижда без хоризонтално превъртане */
@media (max-width: 640px) {
  .sc-table { min-width: 0; }
  .sc-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .sc-table tbody { display: block; }
  .sc-table tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 12px; padding: 15px 18px;
    border-bottom: 1px solid var(--rule); }
  .sc-table tr:last-child { border-bottom: 0; }
  .sc-table td { display: block; padding: 0; border: 0; }
  .sc-table td:nth-child(1) { grid-column: 1; grid-row: 1; }
  .sc-table td:nth-child(3) { grid-column: 2; grid-row: 1; }
  .sc-table td:nth-child(2), .sc-table td:nth-child(4) { grid-column: 1 / -1; font-size: 14px; }
  .sc-table td.sc-empty { grid-column: 1 / -1; }
}
`;
