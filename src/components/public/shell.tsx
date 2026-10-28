import Link from "next/link";
import type { ReactNode } from "react";
import { PUBLIC_CSS } from "./styles";

export type Lang = "bg" | "en";

/** Публичните страници: български на основния адрес, английски под /en */
export const PUBLIC_PAGES = {
  home: { bg: "/", en: "/en" },
  stablecoins: { bg: "/stablecoins", en: "/en/stablecoins" },
} as const;
export type PublicPage = keyof typeof PUBLIC_PAGES;

const T = {
  bg: {
    nav: "Навигация",
    stablecoins: "Стейбълкойн чекър",
    login: "Вход",
    signup: "Създай профил",
    switchTo: "EN",
    switchLabel: "English version",
    disclaimer:
      "Автоматизирана предварителна оценка по Регламент (ЕС) 2023/1114 (MiCA) и насоките на ESMA. Не е правен съвет.",
  },
  en: {
    nav: "Navigation",
    stablecoins: "Stablecoin checker",
    login: "Log in",
    signup: "Create account",
    switchTo: "BG",
    switchLabel: "Българска версия",
    disclaimer:
      "Automated preliminary assessment under Regulation (EU) 2023/1114 (MiCA) and ESMA guidance. Not legal advice.",
  },
} as const;

export function PublicShell({ lang, page, children }: { lang: Lang; page: PublicPage; children: ReactNode }) {
  const t = T[lang];
  const other: Lang = lang === "bg" ? "en" : "bg";
  return (
    <div className="lp" lang={lang}>
      <style>{PUBLIC_CSS}</style>

      <header className="lp-wrap lp-nav">
        <Link href={PUBLIC_PAGES.home[lang]} className="lp-logo">
          MiCA-Guard
        </Link>
        <nav className="lp-nav-links" aria-label={t.nav}>
          <Link
            href={PUBLIC_PAGES.stablecoins[lang]}
            className="lp-navlink"
            aria-current={page === "stablecoins" ? "page" : undefined}
          >
            {t.stablecoins}
          </Link>
          <Link href="/login" className="lp-navlink lp-navlink-wide">
            {t.login}
          </Link>
          <Link href="/login?mode=signup" className="lp-btn lp-btn-small">
            {t.signup}
          </Link>
          <Link href={PUBLIC_PAGES[page][other]} className="lp-lang" hrefLang={other} aria-label={t.switchLabel}>
            {t.switchTo}
          </Link>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="lp-wrap lp-footer">
        <p>{t.disclaimer}</p>
        <p>
          © 2026 MiCA-Guard. <a href="mailto:team@micaguard.eu">team@micaguard.eu</a>
        </p>
      </footer>
    </div>
  );
}
