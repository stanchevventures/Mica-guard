import { createClient } from "@supabase/supabase-js";

// Клиент без сесия и без бисквитки — за публичните страници (стейбълкойн чекъра).
// Ползва публичния ключ, затова вижда само таблиците, отворени за роля anon (миграция 0007):
// копието на регистъра на ESMA. Данните на потребителите остават защитени от RLS.
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Липсват NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
