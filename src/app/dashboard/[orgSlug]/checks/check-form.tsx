"use client";

import { useActionState, useState } from "react";
import type { CheckState } from "./actions";

type Asset = {
  id: string;
  symbol: string;
  name: string;
  blockchain: string;
  mica_classification: string;
};

const fieldClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none";

export function CheckForm({
  action,
  assets,
  classificationLabels,
}: {
  action: (prev: CheckState, formData: FormData) => Promise<CheckState>;
  assets: Asset[];
  classificationLabels: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState<CheckState, FormData>(action, {});
  const [assetId, setAssetId] = useState("");
  const selected = assets.find((a) => a.id === assetId);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm text-slate-300">Криптоактив</label>
        <select
          name="asset_id"
          required
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          className={fieldClass}
        >
          <option value="" disabled>Избери актив…</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.symbol} — {a.name} ({a.blockchain})
            </option>
          ))}
        </select>
        {selected && (
          <p className="mt-1 text-xs text-slate-400">
            Класификация в каталога:{" "}
            {classificationLabels[selected.mica_classification] ?? selected.mica_classification}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-300">
          Линк към бялата книга <span className="text-slate-500">(по избор)</span>
        </label>
        <input name="whitepaper_url" type="url" placeholder="https://…" className={fieldClass} />
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-300">
          Дата на нотифициране към НКО <span className="text-slate-500">(по избор)</span>
        </label>
        <input name="whitepaper_notified_at" type="date" className={fieldClass} />
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Проверката се изпълнява…" : "Пусни проверка"}
      </button>
    </form>
  );
}
