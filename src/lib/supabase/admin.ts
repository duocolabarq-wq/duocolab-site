import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

// Cliente com a chave secreta (ignora as regras de acesso). Usar só no servidor,
// e só depois de confirmar que quem pediu é da equipe.
export const supabaseAdmin = () =>
  createClient(SUPABASE_URL, (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)!, {
    auth: { persistSession: false },
  });
