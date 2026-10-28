import type { Metadata } from "next";
import { StablecoinsPage } from "@/components/public/stablecoins-view";

export const metadata: Metadata = {
  title: { absolute: "Stablecoin checker: which comply with MiCA · MiCA-Guard" },
  description:
    "Free check of USDT, USDC, EURC and other stablecoins against the ESMA register, and the days left until 8 Jan 2027.",
  alternates: { canonical: "/en/stablecoins", languages: { bg: "/stablecoins", en: "/en/stablecoins" } },
  openGraph: {
    locale: "en_GB",
    title: "Stablecoin checker: which comply with MiCA",
    description: "USDT, USDC, EURC and other stablecoins checked against the ESMA register every day.",
  },
};

export default function Page() {
  return <StablecoinsPage lang="en" />;
}
