import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { signout } from "../login/actions";

// Обща горна лента за таблото — като на micaguard.eu. Скрива се при печат на доклада.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0a0d14]/70 backdrop-blur-md print:hidden">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Logo href="/dashboard" size={34} />
          <nav aria-label="Основна" className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="hidden font-medium text-slate-300 hover:text-cyan-300 sm:inline">
              Табло
            </Link>
            <Link href="/stablecoins" className="hidden font-medium text-slate-300 hover:text-cyan-300 sm:inline">
              Стейбълкойни
            </Link>
            <a href="https://micaguard.eu" className="hidden font-medium text-slate-300 hover:text-cyan-300 md:inline">
              micaguard.eu
            </a>
            <form action={signout}>
              <button className="rounded-lg border border-slate-700 px-3 py-1.5 font-medium text-slate-200 hover:border-cyan-500/50 hover:text-white">
                Изход
              </button>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
