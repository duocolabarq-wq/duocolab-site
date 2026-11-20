import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

export async function supabaseServidor() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // chamado de um Server Component: o proxy já renova a sessão.
        }
      },
    },
  });
}

/** Usuário logado (ou null) e se ele faz parte da equipe Duo. */
export async function sessao() {
  const sb = await supabaseServidor();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) return { sb, user: null, equipe: false };
  const { data: eq } = await sb.rpc("sou_equipe");
  return { sb, user, equipe: Boolean(eq) };
}
