import { createClient } from "@supabase/supabase-js";

// Клиент с пълен достъп (заобикаля RLS). САМО за сървърен код!
// Ползва се, за да запише резултатите от проверката — потребителят
// не може сам да маркира проверка като „compliant“.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Липсва SUPABASE_SECRET_KEY в .env.local (виж Supabase -> Settings -> API Keys -> Secret keys)."
    );
  }

  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
