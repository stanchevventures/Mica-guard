"use client";

import { useActionState } from "react";
import type { SettingsState } from "./actions";

const fieldClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none disabled:opacity-60";

export function SettingsForm({
  action,
  initial,
  canEdit,
}: {
  action: (prev: SettingsState, formData: FormData) => Promise<SettingsState>;
  initial: { casp_license_number: string | null; nca_name: string | null; lei: string | null };
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm text-slate-300">
          Номер на лиценз (CASP, чл. 63) или нотификация (чл. 60)
        </label>
        <input
          name="casp_license_number"
          defaultValue={initial.casp_license_number ?? ""}
          placeholder="напр. номер от решението на КФН"
          disabled={!canEdit}
          className={fieldClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-300">Национален компетентен орган</label>
        <input
          name="nca_name"
          defaultValue={initial.nca_name ?? ""}
          placeholder="напр. Комисия за финансов надзор (КФН)"
          disabled={!canEdit}
          className={fieldClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-300">
          LEI <span className="text-slate-500">(по избор)</span>
        </label>
        <input
          name="lei"
          defaultValue={initial.lei ?? ""}
          placeholder="20 символа"
          maxLength={20}
          disabled={!canEdit}
          className={`${fieldClass} font-mono uppercase`}
        />
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.message && <p className="text-sm text-emerald-400">{state.message}</p>}

      {canEdit ? (
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {pending ? "Записване…" : "Запази"}
        </button>
      ) : (
        <p className="text-sm text-slate-400">Само собственик или администратор може да променя тези данни.</p>
      )}
    </form>
  );
}
