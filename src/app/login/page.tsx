"use client";

import { useActionState, useState } from "react";
import { login, signup, type AuthState } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(login, {});
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(signup, {});

  const isLogin = mode === "login";
  const state = isLogin ? loginState : signupState;
  const pending = isLogin ? loginPending : signupPending;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-white">MiCA-Guard</h1>
        <p className="mt-1 text-sm text-slate-400">
          {isLogin ? "Влез в профила си" : "Създай нов профил"}
        </p>

        <form action={isLogin ? loginAction : signupAction} className="mt-6 space-y-4">
          {!isLogin && (
            <input
              name="full_name"
              type="text"
              placeholder="Име и фамилия"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          )}
          <input
            name="email"
            type="email"
            required
            placeholder="Имейл"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Парола (мин. 8 символа)"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />

          {state.error && <p className="text-sm text-red-400">{state.error}</p>}
          {state.message && <p className="text-sm text-emerald-400">{state.message}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? "Моля, изчакай…" : isLogin ? "Вход" : "Регистрация"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(isLogin ? "signup" : "login")}
          className="mt-4 w-full text-sm text-slate-400 hover:text-white"
        >
          {isLogin ? "Нямаш профил? Регистрирай се" : "Имаш профил? Влез"}
        </button>
      </div>
    </main>
  );
}
