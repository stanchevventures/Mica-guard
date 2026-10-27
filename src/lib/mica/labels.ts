// Етикети и цветове за резултатите — ползват се на няколко страници

export const RESULT_LABEL: Record<string, string> = {
  compliant: "Съответства",
  partially_compliant: "Частично",
  non_compliant: "Не съответства",
  inconclusive: "Неопределен",
};

export const RESULT_STYLE: Record<string, string> = {
  compliant: "bg-emerald-950 text-emerald-300",
  partially_compliant: "bg-amber-950 text-amber-300",
  non_compliant: "bg-red-950 text-red-300",
  inconclusive: "bg-slate-800 text-slate-300",
};

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
