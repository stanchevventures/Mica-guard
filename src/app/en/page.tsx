import type { Metadata } from "next";
import { Landing } from "@/components/public/landing";

const description =
  "MiCA compliance checks for crypto-assets, matched against the ESMA register: licences, stablecoins, white papers and audit-ready reports.";

export const metadata: Metadata = {
  title: { absolute: "MiCA-Guard — MiCA compliance checks" },
  description,
  alternates: { canonical: "/en", languages: { bg: "/", en: "/en" } },
  openGraph: { locale: "en_GB", title: "MiCA-Guard — MiCA compliance checks", description },
};

export default function EnglishHomePage() {
  return <Landing lang="en" />;
}
