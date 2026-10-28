import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";

// IBM Plex — с кирилица; шрифтовете се вграждат при build (без заявки към Google от браузъра)
const sans = IBM_Plex_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const serif = IBM_Plex_Serif({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-serif",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://micaguard.eu";
const description =
  "Проверка за съответствие с Регламент (ЕС) 2023/1114 (MiCA), сверена с регистъра на ESMA: лицензи, стейбълкойни, бели книги и доклади за одит.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MiCA-Guard — проверка за съответствие с MiCA",
    template: "%s · MiCA-Guard",
  },
  description,
  applicationName: "MiCA-Guard",
  openGraph: {
    type: "website",
    locale: "bg_BG",
    siteName: "MiCA-Guard",
    title: "MiCA-Guard — проверка за съответствие с MiCA",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="bg" className={`${sans.variable} ${serif.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
