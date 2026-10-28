// Стилове на публичните страници (начална страница, стейбълкойн чекър). Светла тема, независима от таблото.
export const PUBLIC_CSS = `
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

/* ---- общи: езиков превключвател, навигация ---- */
.lp-nav-links .lp-navlink { text-decoration: none; color: var(--slate); }
.lp-nav-links .lp-navlink:hover, .lp-nav-links .lp-navlink[aria-current="page"] { color: var(--ink); }
.lp-lang { font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-decoration: none; color: var(--slate);
  border: 1px solid var(--rule); border-radius: 6px; padding: 3px 8px; }
.lp-lang:hover { color: var(--ink); border-color: var(--slate); }

/* ---- стейбълкойн чекър ---- */
.sc-hero { padding-top: 40px; padding-bottom: 48px; display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 48px; align-items: end; }
.sc-hero h1 { font-family: var(--font-plex-serif), ui-serif, Georgia, serif; font-weight: 500; font-size: 42px;
  line-height: 1.12; letter-spacing: -0.015em; max-width: 18ch; text-wrap: balance; }
.sc-countdown { background: var(--sheet); border: 1px solid var(--rule); border-left: 4px solid var(--fail);
  border-radius: 10px; padding: 20px 24px; }
.sc-countdown .sc-countdown-num { margin-top: 0; font-family: var(--font-plex-serif), ui-serif, Georgia, serif; font-size: 56px; line-height: 1;
  letter-spacing: -0.02em; color: var(--fail); }
.sc-countdown-num small { font-size: 18px; color: var(--ink); margin-left: 8px; letter-spacing: 0; }
.sc-countdown p { margin-top: 10px; font-size: 14px; color: var(--slate); }
.sc-countdown strong { color: var(--ink); }
.sc-meta { display: flex; flex-wrap: wrap; gap: 8px 24px; font-size: 14px; color: var(--slate); margin-bottom: 16px; }
.sc-search { width: 100%; max-width: 360px; font: inherit; font-size: 15px; padding: 10px 14px; border-radius: 8px;
  border: 1px solid var(--rule); background: var(--sheet); color: var(--ink); }
.sc-search:focus { outline: 2px solid var(--action); outline-offset: 1px; border-color: var(--action); }
.sc-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.sc-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 13px; color: var(--slate); }
.sc-table-wrap { background: var(--sheet); border: 1px solid var(--rule); border-radius: 10px; overflow-x: auto; }
.sc-table { width: 100%; border-collapse: collapse; font-size: 15px; min-width: 720px; }
.sc-table th { text-align: left; font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
  color: var(--slate); padding: 12px 16px; border-bottom: 1px solid var(--rule); white-space: nowrap; }
.sc-table td { padding: 14px 16px; border-bottom: 1px solid var(--rule); vertical-align: top; }
.sc-table tr:last-child td { border-bottom: 0; }
.sc-sym { font-weight: 600; }
.sc-sub { display: block; font-size: 13px; color: var(--slate); }
.sc-table a { color: var(--ink); text-underline-offset: 3px; }
.sc-table a:hover { color: var(--action); }
.sc-status { display: inline-block; white-space: nowrap; font-size: 13px; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
.sc-authorised { color: var(--pass); background: var(--pass-bg); }
.sc-not_found, .sc-ended { color: var(--fail); background: var(--fail-bg); }
.sc-check { color: #93370D; background: #FFFAEB; }
.sc-empty { padding: 24px 16px; color: var(--slate); }
.sc-note { margin-top: 12px; font-size: 13px; color: var(--slate); max-width: 80ch; }
.sc-issuers { list-style: none; border-top: 1px solid var(--rule); }
.sc-issuers li { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.4fr); gap: 16px;
  padding: 14px 0; border-bottom: 1px solid var(--rule); font-size: 15px; }
.sc-issuers .sc-sub a { color: var(--slate); }
.sc-papers { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 14px; }
.sc-papers a { color: var(--ink); text-underline-offset: 3px; }
.sc-what { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; list-style: none; }
.sc-what h3 { font-size: 17px; font-weight: 600; line-height: 1.35; margin-bottom: 6px; }
.sc-what p { color: var(--slate); font-size: 15px; }
.sc-cta { background: var(--ink); color: #FFFFFF; border-radius: 12px; padding: 32px; display: flex; flex-wrap: wrap;
  align-items: center; justify-content: space-between; gap: 20px; }
.sc-cta h2 { font-family: var(--font-plex-serif), ui-serif, Georgia, serif; font-weight: 500; font-size: 26px; margin: 0; }
.sc-cta p { color: #C9D2DE; margin-top: 6px; max-width: 60ch; }
.sc-error { background: var(--fail-bg); color: var(--fail); border-radius: 10px; padding: 16px 20px; }

@media (max-width: 900px) {
  .sc-hero { grid-template-columns: minmax(0, 1fr); gap: 28px; padding-top: 16px; }
  .sc-hero h1 { font-size: 34px; }
  .sc-issuers li { grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .sc-what { grid-template-columns: minmax(0, 1fr); gap: 20px; }
}
@media (max-width: 480px) {
  .sc-hero h1 { font-size: 29px; }
  .sc-countdown .sc-countdown-num { font-size: 44px; }
  .lp-nav { flex-wrap: wrap; gap: 12px; }
  .lp-nav-links { gap: 12px; font-size: 14px; flex-wrap: wrap; }
  .lp-nav-links .lp-navlink-wide { display: none; }
}

/* Стейбълкойн таблицата като карти на телефон — статусът да се вижда без хоризонтално превъртане */
@media (max-width: 640px) {
  .sc-table { min-width: 0; }
  .sc-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .sc-table tbody { display: block; }
  .sc-table tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 12px; padding: 14px 16px;
    border-bottom: 1px solid var(--rule); }
  .sc-table tr:last-child { border-bottom: 0; }
  .sc-table td { display: block; padding: 0; border: 0; }
  .sc-table td:nth-child(1) { grid-column: 1; grid-row: 1; }
  .sc-table td:nth-child(3) { grid-column: 2; grid-row: 1; }
  .sc-table td:nth-child(2), .sc-table td:nth-child(4) { grid-column: 1 / -1; font-size: 14px; }
  .sc-table td.sc-empty { grid-column: 1 / -1; }
}
`;
