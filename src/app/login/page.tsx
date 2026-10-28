"use client";

import { useActionState, useEffect, useState } from "react";
import { Logo } from "@/components/brand";
import { login, requestPasswordReset, signup, type AuthState } from "./actions";

type Mode = "login" | "signup" | "reset";

const fieldClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none";

const TITLES: Record<Mode, string> = {
  login: "Влез в профила си",
  signup: "Създай нов профил",
  reset: "Нова парола — ще ти изпратим линк по имейл",
};

const SUBMIT: Record<Mode, string> = {
  login: "Вход",
  signup: "Регистрация",
  reset: "Изпрати линк",
};

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [notice, setNotice] = useState<string | null>(null);
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(login, {});
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(signup, {});
  const [resetState, resetAction, resetPending] = useActionState<AuthState, FormData>(requestPasswordReset, {});

  // ?mode=signup от началната страница; съобщение след линк от имейл (?error=link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");
    if (params.get("error") === "link") {
      setNotice(
        "Линкът е невалиден, изтекъл или отворен в друг браузър. Ако вече си потвърдил имейла, просто влез с паролата си."
      );
    } else if (params.get("reset") === "done") {
      setNotice("Паролата е сменена. Влез с новата парола.");
    }
  }, []);

  const state = mode === "login" ? loginState : mode === "signup" ? signupState : resetState;
  const pending = mode === "login" ? loginPending : mode === "signup" ? signupPending : resetPending;
  const action = mode === "login" ? loginAction : mode === "signup" ? signupAction : resetAction;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <Logo size={36} />
        <p className="mt-4 text-sm text-slate-400">{TITLES[mode]}</p>

        {notice && (
          <p className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">{notice}</p>
        )}

        <form key={mode} action={action} className="mt-6 space-y-4">
          {mode === "signup" && (
            <input name="full_name" type="text" placeholder="Име и фамилия" autoComplete="name" className={fieldClass} />
          )}
          <input
            name="email"
            type="email"
            required
            placeholder="Имейл"
            autoComplete="email"
            className={fieldClass}
          />
          {mode !== "reset" && (
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Парола (мин. 8 символа)"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={fieldClass}
            />
          )}

          {state.error && <p className="text-sm text-red-400">{state.error}</p>}
          {state.message && <p className="text-sm text-emerald-400">{state.message}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg btn-grad py-2 font-medium text-white disabled:opacity-50"
          >
            {pending ? "Моля, изчакай…" : SUBMIT[mode]}
          </button>
        </form>

        <div className="mt-4 space-y-2 text-center text-sm">
          {mode === "login" && (
            <button type="button" onClick={() => setMode("reset")} className="w-full text-slate-400 hover:text-white">
              Забравена парола?
            </button>
          )}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="w-full text-slate-400 hover:text-white"
          >
            {mode === "login" ? "Нямаш профил? Регистрирай се" : "Към входа"}
          </button>
        </div>
      </div>
    </main>
  );
}
