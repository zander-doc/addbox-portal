// Alex de ADDBOX — Conexión a Supabase (server-side con service role)
import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
  console.error("❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE en .env");
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export default supabase;
