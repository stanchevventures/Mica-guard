// Етикети, цветове и форматиране — ползват се на няколко страници

export const RESULT_LABEL: Record<string, string> = {
  compliant: "Съответства",
  partially_compliant: "Частично",
  non_compliant: "Не съответства",
  inconclusive: "Неокончателен",
};

export const RESULT_HINT: Record<string, string> = {
  compliant: "Всички приложими изисквания са потвърдени с данни.",
  partially_compliant: "Има пропуски със средна или ниска тежест или предстоящи срокове.",
  non_compliant: "Установено е нарушение с висока или критична тежест.",
  inconclusive: "Липсват данни за изискване с висока или критична тежест — оценката не може да бъде завършена.",
};

export const RESULT_STYLE: Record<string, string> = {
  compliant: "bg-emerald-950 text-emerald-300",
  partially_compliant: "bg-amber-950 text-amber-300",
  non_compliant: "bg-red-950 text-red-300",
  inconclusive: "bg-slate-800 text-slate-200",
};

export const OUTCOME_LABEL: Record<string, string> = {
  pass: "Изпълнено",
  fail: "Нарушение",
  evidence_required: "Нужни са данни",
  upcoming: "Предстои",
  not_applicable: "Информация",
};

export const OUTCOME_ICON: Record<string, string> = {
  pass: "✓",
  fail: "✗",
  evidence_required: "?",
  upcoming: "◷",
  not_applicable: "i",
};

export const OUTCOME_STYLE: Record<string, string> = {
  pass: "bg-emerald-950 text-emerald-300",
  fail: "bg-red-950 text-red-300",
  evidence_required: "bg-amber-950 text-amber-300",
  upcoming: "bg-sky-950 text-sky-300",
  not_applicable: "bg-slate-800 text-slate-300",
};

/** Подредба на констатациите: първо нарушенията, после липсващите данни и т.н. */
export const OUTCOME_ORDER = ["fail", "evidence_required", "upcoming", "pass", "not_applicable"];

export const STATUS_LABEL: Record<string, string> = {
  queued: "В опашка",
  running: "Изпълнява се",
  completed: "Завършена",
  failed: "Грешка",
  cancelled: "Отказана",
};

export const SEVERITY_LABEL: Record<string, string> = {
  info: "Инфо",
  low: "Ниска",
  medium: "Средна",
  high: "Висока",
  critical: "Критична",
};

export const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

export const SEVERITY_STYLE: Record<string, string> = {
  info: "text-slate-400",
  low: "text-sky-300",
  medium: "text-amber-300",
  high: "text-orange-400",
  critical: "text-red-400",
};

export const CLASSIFICATION_LABEL: Record<string, string> = {
  art: "ART",
  emt: "EMT",
  other_crypto_asset: "Друг криптоактив",
  excluded: "Извън обхвата",
  unclassified: "Некласифициран",
};

/** Услугите по чл. 3(1), т. 16 — с буквата от регламента */
export const ACTIVITY_LABEL: Record<string, string> = {
  custody: "а) Попечителство и администриране",
  trading_platform: "б) Управление на платформа за търговия",
  exchange_funds: "в) Обмен срещу парични средства",
  exchange_crypto: "г) Обмен срещу други криптоактиви",
  execution: "д) Изпълнение на нареждания",
  placing: "е) Пласиране",
  rto: "ж) Приемане и предаване на нареждания",
  advice: "з) Съвети",
  portfolio: "и) Управление на портфейл",
  transfer: "й) Прехвърляне",
  offer_to_public: "Публично предлагане (организацията е оферент)",
};

export const ENTITY_LABEL: Record<string, string> = {
  casp: "Доставчик на услуги за криптоактиви (CASP)",
  issuer: "Емитент / оферент на криптоактиви",
  credit_institution: "Кредитна институция",
  csd: "Централен депозитар на ценни книжа",
  investment_firm: "Инвестиционен посредник",
  emi: "Институция за електронни пари",
  fund_manager: "Управляващо дружество / ЛУАИФ",
  market_operator: "Пазарен оператор",
  other: "Друго",
};

export const SOURCE_LABEL: Record<string, string> = {
  esma_register: "регистър на ESMA",
  catalog: "каталог",
  user: "декларация на потребителя",
  org_settings: "настройки на организацията",
  regulation: "регламент / надзорен документ",
};

export const TRI_LABEL: Record<string, string> = {
  yes: "Да",
  no: "Не",
  unknown: "Не знам",
};

export const ADMISSION_LABEL: Record<string, string> = {
  new: "Ново допускане (след 30.12.2024)",
  before_mica: "Допуснат преди 30.12.2024",
  elsewhere_consent: "Допуснат на друга платформа в ЕС, със съгласие за ползване на бялата книга",
};

/** "2026-04-28" -> "28.04.2026" (дата без час) */
export function formatDay(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : "—";
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Sofia",
  });
}
