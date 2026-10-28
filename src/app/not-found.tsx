import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-white">
      <div className="max-w-md text-center">
        <p className="text-sm text-slate-400">Грешка 404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Страницата не е намерена</h1>
        <p className="mt-3 text-slate-400">
          Адресът е грешен или нямаш достъп до тази организация или проверка.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard" className="rounded-lg btn-grad px-4 py-2 text-sm font-medium">
            Към таблото
          </Link>
          <Link href="/" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
            Начална страница
          </Link>
        </div>
      </div>
    </main>
  );
}
