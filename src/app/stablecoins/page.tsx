import type { Metadata } from "next";
import { StablecoinsPage } from "@/components/public/stablecoins-view";

export const metadata: Metadata = {
  title: "Стейбълкойн чекър: кои отговарят на MiCA",
  description:
    "Безплатна проверка на USDT, USDC, EURC и други стейбълкойни срещу регистъра на ESMA. Колко дни остават до 08.01.2027.",
  alternates: { canonical: "/stablecoins", languages: { bg: "/stablecoins", en: "/en/stablecoins" } },
  openGraph: {
    locale: "bg_BG",
    title: "Стейбълкойн чекър: кои отговарят на MiCA",
    description: "USDT, USDC, EURC и други стейбълкойни, сверени с регистъра на ESMA всеки ден.",
  },
};

export default function Page() {
  return <StablecoinsPage lang="bg" />;
}
