"use client";

import { useActionState } from "react";
import { updatePassword, type ResetState } from "./actions";

const fieldClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none";

// Достъпна само с валидна сесия от линка в имейла (proxy пренасочва останалите към /login)
export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<ResetState, FormData>(updatePassword, {});

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-white">Нова парола</h1>
        <p className="mt-1 text-sm text-slate-400">Въведи новата парола два пъти.</p>

        <form action={action} className="mt-6 space-y-4">
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Нова парола (мин. 8 символа)"
            autoComplete="new-password"
            className={fieldClass}
          />
          <input
            name="confirm"
            type="password"
            required
            minLength={8}
            placeholder="Повтори паролата"
            autoComplete="new-password"
            className={fieldClass}
          />

          {state.error && <p className="text-sm text-red-400">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? "Записване…" : "Запази новата парола"}
          </button>
        </form>
      </div>
    </main>
  );
}
