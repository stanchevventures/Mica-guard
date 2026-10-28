"use client";

import Link from "next/link";

// Показва се при неочаквана грешка в страница. Подробностите остават в логовете на Vercel.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Страницата не се зареди</h1>
        <p className="mt-3 text-slate-400">
          Възникна грешка на сървъра. Опитай отново; ако се повтаря, пиши ни на team@micaguard.eu
          {error.digest ? ` с код ${error.digest}` : ""}.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
          >
            Опитай отново
          </button>
          <Link href="/dashboard" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
            Към таблото
          </Link>
        </div>
      </div>
    </main>
  );
}
