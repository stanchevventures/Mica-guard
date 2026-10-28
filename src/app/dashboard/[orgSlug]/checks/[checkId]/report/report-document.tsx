// Доклад за оценка — оформление за печат (A4). Без React hooks, затова може да се
// рендерира на сървъра. Стиловете са собствени (не Tailwind), за да изглежда
// еднакво на екран и на хартия.
import {
  ACTIVITY_LABEL,
  ADMISSION_LABEL,
  CLASSIFICATION_LABEL,
  ENTITY_LABEL,
  OUTCOME_LABEL,
  OUTCOME_ORDER,
  RESULT_HINT,
  RESULT_LABEL,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
  SOURCE_LABEL,
  STATUS_LABEL,
  TRI_LABEL,
  formatDate,
} from "@/lib/mica/labels";
import type { ReportData } from "@/lib/mica/report";

const ISSUE = new Set(["fail", "evidence_required", "upcoming"]);

export function ReportDocument({
  data,
  fingerprint,
  generatedAt,
}: {
  data: ReportData;
  fingerprint: string;
  generatedAt: string;
}) {
  const { check, organization: org, asset, answers } = data;
  const findings = [...data.findings].sort(
    (a, b) =>
      OUTCOME_ORDER.indexOf(a.outcome) - OUTCOME_ORDER.indexOf(b.outcome) ||
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );
  const risk = check.risk_score;
  const reportNo = check.id.slice(0, 8).toUpperCase();
  const tri = (v: unknown) => (typeof v === "string" ? TRI_LABEL[v] ?? v : null);

  const inputs: [string, string | null][] = [
    ["Идентифицируем емитент", tri(answers.identifiable_issuer)],
    [
      "Допускане до търговия",
      typeof answers.admission === "string" ? ADMISSION_LABEL[answers.admission] ?? answers.admission : null,
    ],
    ["Бяла книга (декларация)", tri(answers.whitepaper)],
    ["Линк към бялата книга", typeof answers.whitepaper_url === "string" ? answers.whitepaper_url : null],
    [
      "Дата на нотифициране",
      typeof answers.whitepaper_notified_at === "string" ? answers.whitepaper_notified_at : null,
    ],
    ["Писмено съгласие от емитента", tri(answers.issuer_consent)],
    ["Документирана оценка на пригодността", tri(answers.suitability_documented)],
    ["Идентифициране на притежателите", tri(answers.holders_identifiable)],
  ];
  const shownInputs = inputs.filter(([, v]) => v !== null) as [string, string][];

  return (
    <article className="rp">
      <style>{CSS}</style>

      {/* ---------------- Заглавие ---------------- */}
      <header className="rp-head">
        <div>
          <div className="rp-brand">MiCA-Guard</div>
          <h1 className="rp-title">Доклад за оценка на съответствието с MiCA</h1>
          <div className="rp-sub">Регламент (ЕС) 2023/1114 относно пазарите на криптоактиви</div>
        </div>
        <dl className="rp-meta">
          <dt>Доклад №</dt>
          <dd className="rp-mono">{reportNo}</dd>
          <dt>Дата на оценката</dt>
          <dd>{formatDate(data.evaluated_at ?? check.created_at)}</dd>
          <dt>Генериран</dt>
          <dd>{formatDate(generatedAt)}</dd>
        </dl>
      </header>

      {/* ---------------- Организация и актив ---------------- */}
      <section className="rp-grid">
        <div className="rp-box">
          <h3>Организация</h3>
          <dl className="rp-kv">
            <dt>Наименование</dt>
            <dd>{org.name}</dd>
            <dt>Вид</dt>
            <dd>{ENTITY_LABEL[org.entity_type] ?? org.entity_type}</dd>
            <dt>Държава</dt>
            <dd>{org.country_code ?? "—"}</dd>
            <dt>LEI</dt>
            <dd className="rp-mono">{org.lei ?? "—"}</dd>
            <dt>Лиценз / нотификация</dt>
            <dd>{org.casp_license_number ?? "не е въведен"}</dd>
            <dt>Компетентен орган</dt>
            <dd>{org.nca_name ?? "—"}</dd>
          </dl>
        </div>
        <div className="rp-box">
          <h3>Криптоактив</h3>
          <dl className="rp-kv">
            <dt>Актив</dt>
            <dd>
              <b>{asset.symbol}</b> — {asset.name}
            </dd>
            <dt>Блокчейн</dt>
            <dd>{asset.blockchain ? asset.blockchain.charAt(0).toUpperCase() + asset.blockchain.slice(1) : "—"}</dd>
            <dt>Контракт</dt>
            <dd className="rp-mono rp-small">{asset.contract_address ?? "нативен актив"}</dd>
            <dt>Класификация</dt>
            <dd>{check.classification_result ? CLASSIFICATION_LABEL[check.classification_result] : "—"}</dd>
            <dt>Набор правила</dt>
            <dd className="rp-mono">{check.rule_set_version ?? "—"}</dd>
            <dt>Изготвил</dt>
            <dd>{check.requested_by_name ?? "—"}</dd>
          </dl>
        </div>
      </section>

      {/* ---------------- Резултат ---------------- */}
      <section className={`rp-result rp-r-${check.result ?? "none"}`}>
        <div className="rp-result-main">
          <div className="rp-label">Общ резултат</div>
          <div className="rp-result-value">
            {check.result ? RESULT_LABEL[check.result] : STATUS_LABEL[check.status] ?? check.status}
          </div>
          {check.result && <div className="rp-hint">{RESULT_HINT[check.result]}</div>}
        </div>
        <div className="rp-score-box">
          <div className="rp-label">Рисков резултат</div>
          <div className="rp-score">
            {risk ?? "—"}
            <span> / 100</span>
          </div>
          {risk !== null && (
            <div className="rp-bar">
              <span
                style={{
                  width: `${Math.max(2, risk)}%`,
                  background: risk >= 80 ? "#dc2626" : risk >= 50 ? "#ea580c" : risk >= 25 ? "#d97706" : "#059669",
                }}
              />
            </div>
          )}
        </div>
        <dl className="rp-counts">
          <div>
            <dt>Нарушения</dt>
            <dd>{check.failed_findings}</dd>
          </div>
          <div>
            <dt>Нужни данни</dt>
            <dd>{check.evidence_gaps}</dd>
          </div>
          <div>
            <dt>Предстоящи</dt>
            <dd>{check.upcoming_obligations}</dd>
          </div>
        </dl>
      </section>

      {data.services.length > 0 && (
        <section>
          <h2 className="rp-h">Оценени услуги</h2>
          <div className="rp-chips">
            {data.services.map((s) => (
              <span key={s}>{ACTIVITY_LABEL[s] ?? s}</span>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Констатации ---------------- */}
      <section>
        <h2 className="rp-h">Констатации ({findings.length})</h2>
        {findings.map((f, i) => (
          <div key={f.id} className={`rp-f rp-o-${f.outcome}`}>
            <div className="rp-f-top">
              <div>
                <span className="rp-f-no">{i + 1}.</span> <span className="rp-f-title">{f.title}</span>
                <div className="rp-f-ref">
                  {f.rule_code} · MiCA {f.mica_reference ?? "—"}
                  {ISSUE.has(f.outcome) ? ` · тежест: ${SEVERITY_LABEL[f.severity] ?? f.severity}` : ""}
                </div>
              </div>
              <span className={`rp-badge rp-b-${f.outcome}`}>{OUTCOME_LABEL[f.outcome] ?? f.outcome}</span>
            </div>
            {f.details && <p>{f.details}</p>}
            {f.remediation && <p className="rp-rem">Препоръка: {f.remediation}</p>}
            {typeof f.evidence?.source === "string" && (
              <p className="rp-src">Източник на данните: {SOURCE_LABEL[f.evidence.source] ?? f.evidence.source}</p>
            )}
          </div>
        ))}
      </section>

      {/* ---------------- Входни данни ---------------- */}
      {shownInputs.length > 0 && (
        <section className="rp-keep">
          <h2 className="rp-h">Входни данни (декларации към датата на оценката)</h2>
          <table className="rp-table">
            <tbody>
              {shownInputs.map(([k, v]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ---------------- Методология ---------------- */}
      <section className="rp-keep">
        <h2 className="rp-h">Методология</h2>
        <p className="rp-text">
          Всяко изискване получава изход: <b>Изпълнено</b> (потвърдено с данни), <b>Нарушение</b> (данните показват
          неизпълнение), <b>Нужни са данни</b> (изпълнението не може да се потвърди), <b>Предстои</b> (срокът още не е
          изтекъл) или <b>Информация</b>. Общ резултат: <b>Не съответства</b> — нарушение с висока или критична
          тежест; <b>Неокончателен</b> — липсват данни за такова изискване; <b>Частично</b> — пропуски със средна или
          ниска тежест или предстоящи срокове; <b>Съответства</b> — всички приложими изисквания са потвърдени.
          Рисковият резултат се определя от най-тежкия проблем (критичен 80, висок 55, среден 30, нисък 10) плюс
          добавка за всеки следващ (10 / 7 / 4 / 2), до 100. Пълното описание на правилата и правните им основания
          е в документацията на набора правила {check.rule_set_version ?? ""}
          {data.engine_version && data.engine_version !== check.rule_set_version ? ` (двигател ${data.engine_version})` : ""}.
        </p>
      </section>

      {/* ---------------- Подписи ---------------- */}
      <section className="rp-keep">
        <h2 className="rp-h">Преглед и одобрение</h2>
        <div className="rp-sign">
          <div>
            <div className="rp-label">Изготвил</div>
            <div className="rp-line">{check.requested_by_name ?? ""}</div>
            <div className="rp-sign-cap">име, подпис, дата</div>
          </div>
          <div>
            <div className="rp-label">Прегледал (служител по съответствието)</div>
            <div className="rp-line" />
            <div className="rp-sign-cap">име, подпис, дата</div>
          </div>
        </div>
      </section>

      {/* ---------------- Цялост и отказ от отговорност ---------------- */}
      <footer className="rp-foot">
        <p>
          <b>Контролна сума (SHA-256):</b> <span className="rp-hash">{fingerprint}</span>
        </p>
        <p>
          Сумата е изчислена от резултата, констатациите и входните данни на проверка {check.id}. Повторното
          генериране на доклада от системата дава същата сума, ако данните не са променяни.
        </p>
        <p>
          Автоматизирана предварителна оценка по Регламент (ЕС) 2023/1114 (MiCA) и свързаните насоки на ESMA. Не
          представлява правно становище. Декларираните от потребителя данни не се проверяват автоматично.
          Резултатите следва да бъдат прегледани от квалифициран специалист по съответствието.
        </p>
      </footer>
    </article>
  );
}

const CSS = `
@page { size: A4; margin: 14mm 13mm 16mm; }
.rp { --ink:#0f172a; --muted:#475569; --line:#cbd5e1; --soft:#f8fafc;
  font-family: "Segoe UI", "Helvetica Neue", Arial, "DejaVu Sans", sans-serif;
  color: var(--ink); background: #fff; width: 210mm; max-width: 100%; margin: 0 auto;
  padding: 14mm 13mm; font-size: 10pt; line-height: 1.45; box-shadow: 0 1px 6px rgba(15,23,42,.15); }
.rp *, .rp *::before, .rp *::after { box-sizing: border-box; }
.rp, .rp * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.rp dl, .rp dd, .rp p, .rp h1, .rp h2, .rp h3 { margin: 0; }
.rp-mono, .rp-hash { font-family: Consolas, "DejaVu Sans Mono", monospace; }
.rp-small { font-size: 8pt; word-break: break-all; }
.rp-head { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid var(--ink); padding-bottom: 8px; }
.rp-brand { font-weight: 800; font-size: 10pt; letter-spacing: .08em; color: #047857; text-transform: uppercase; }
.rp-title { font-size: 15pt; font-weight: 700; margin-top: 2px; }
.rp-sub { font-size: 8.5pt; color: var(--muted); }
.rp-meta { display: grid; grid-template-columns: auto auto; gap: 1px 10px; font-size: 8.5pt; align-content: start; text-align: right; white-space: nowrap; }
.rp-meta dt { color: var(--muted); }
.rp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
.rp-box { border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; }
.rp-box h3, .rp-label { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--muted); }
.rp-box h3 { margin-bottom: 5px; }
.rp-kv { display: grid; grid-template-columns: 36% 64%; gap: 2px 8px; font-size: 9pt; }
.rp-kv dt { color: var(--muted); }
.rp-kv dd { word-break: break-word; }
.rp-result { margin-top: 12px; border: 2px solid var(--line); border-left-width: 8px; border-radius: 8px; padding: 10px 12px;
  display: grid; grid-template-columns: 1.4fr .9fr 1.3fr; gap: 14px; align-items: center; break-inside: avoid; }
.rp-r-compliant { border-color: #059669; } .rp-r-compliant .rp-result-value { color: #047857; }
.rp-r-partially_compliant { border-color: #d97706; } .rp-r-partially_compliant .rp-result-value { color: #b45309; }
.rp-r-non_compliant { border-color: #dc2626; } .rp-r-non_compliant .rp-result-value { color: #b91c1c; }
.rp-r-inconclusive { border-color: #64748b; } .rp-r-inconclusive .rp-result-value { color: #334155; }
.rp-result-value { font-size: 16pt; font-weight: 800; }
.rp-hint { font-size: 8.5pt; color: var(--muted); }
.rp-score { font-size: 18pt; font-weight: 800; } .rp-score span { font-size: 9pt; color: var(--muted); font-weight: 400; }
.rp-bar { height: 6px; background: #e2e8f0; border-radius: 3px; margin-top: 3px; }
.rp-bar span { display: block; height: 6px; border-radius: 3px; }
.rp-counts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center; align-items: start; }
.rp-counts > div { display: flex; flex-direction: column-reverse; justify-content: flex-end; }
.rp-counts dt { font-size: 7pt; line-height: 1.2; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
.rp-counts dd { font-size: 16pt; font-weight: 800; line-height: 1.15; }
.rp .rp-h { font-size: 11pt; font-weight: 700; margin: 14px 0 6px; padding-bottom: 3px; border-bottom: 1px solid var(--line); break-after: avoid; }
.rp-chips span { display: inline-block; border: 1px solid var(--line); background: var(--soft); border-radius: 4px; padding: 1px 6px; margin: 0 4px 4px 0; font-size: 8.5pt; }
.rp-f { border: 1px solid var(--line); border-left: 4px solid var(--line); border-radius: 4px; padding: 6px 9px; margin-bottom: 6px; break-inside: avoid; }
.rp-o-fail { border-left-color: #dc2626; } .rp-o-evidence_required { border-left-color: #d97706; }
.rp-o-upcoming { border-left-color: #0284c7; } .rp-o-pass { border-left-color: #059669; } .rp-o-not_applicable { border-left-color: #94a3b8; }
.rp-f-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.rp-f-no { color: var(--muted); font-weight: 600; }
.rp-f-title { font-weight: 700; }
.rp-f-ref { font-size: 8pt; color: var(--muted); margin-top: 1px; }
.rp-f p { margin-top: 4px; font-size: 9pt; }
.rp-rem { color: #92400e; }
.rp-src { font-size: 8pt !important; color: var(--muted); }
.rp-badge { white-space: nowrap; font-size: 8pt; font-weight: 700; padding: 2px 7px; border-radius: 3px; }
.rp-b-fail { background: #fee2e2; color: #991b1b; } .rp-b-evidence_required { background: #fef3c7; color: #92400e; }
.rp-b-upcoming { background: #e0f2fe; color: #075985; } .rp-b-pass { background: #d1fae5; color: #065f46; }
.rp-b-not_applicable { background: #f1f5f9; color: #334155; }
.rp-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
.rp-table th, .rp-table td { border: 1px solid var(--line); padding: 3px 7px; text-align: left; vertical-align: top; }
.rp-table th { width: 40%; background: var(--soft); font-weight: 600; color: #334155; }
.rp-table td { word-break: break-word; }
.rp-text { font-size: 9pt; text-align: justify; }
.rp-keep { break-inside: avoid; }
.rp-sign { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 4px; }
.rp-line { border-bottom: 1px solid var(--ink); min-height: 26px; padding-top: 8px; font-size: 9.5pt; }
.rp-sign-cap { font-size: 7.5pt; color: var(--muted); margin-top: 2px; }
.rp-foot { margin-top: 14px; padding-top: 6px; border-top: 1px solid var(--line); font-size: 7.8pt; color: var(--muted); break-inside: avoid; }
.rp-foot p + p { margin-top: 3px; }
.rp-hash { color: var(--ink); word-break: break-all; }
.rp-toolbar { width: 210mm; max-width: 100%; margin: 0 auto 10px; display: flex; justify-content: space-between; align-items: center; gap: 12px;
  font-family: "Segoe UI", Arial, "DejaVu Sans", sans-serif; font-size: 13px; color: #334155; }
.rp-toolbar a { color: #334155; text-decoration: none; }
.rp-toolbar a:hover { text-decoration: underline; }
.rp-btn { background: #047857; color: #fff; border: 0; border-radius: 6px; padding: 8px 14px; font-weight: 600; font-size: 13px; cursor: pointer; }
.rp-btn:hover { background: #065f46; }
.rp-page { background: #e2e8f0; min-height: 100vh; padding: 16px 8px 32px; }
@media print {
  .rp-page { background: #fff; padding: 0; min-height: 0; }
  .rp { box-shadow: none; padding: 0; width: auto; }
  .rp-noprint { display: none !important; }
}
`;
