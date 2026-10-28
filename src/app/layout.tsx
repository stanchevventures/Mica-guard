import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter — същият шрифт като на micaguard.eu, с кирилица; вгражда се при build (без заявки към Google от браузъра)
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
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
  themeColor: "#0A0D14",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="bg" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
