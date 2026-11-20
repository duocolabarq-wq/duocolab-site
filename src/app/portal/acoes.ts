"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServidor } from "@/lib/supabase/server";

export type EstadoLogin = { ok?: boolean; erro?: string; email?: string };

export async function enviarLink(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { erro: "Confira o e-mail digitado.", email };

  const sb = await supabaseServidor();
  const { data: autorizado } = await sb.rpc("email_autorizado", { e: email });
  if (!autorizado)
    return { erro: "Não encontramos esse e-mail em nenhum projeto. Use o e-mail do contrato ou fale com a equipe.", email };

  const h = await headers();
  const origem = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origem}/auth/confirm`, shouldCreateUser: true },
  });
  if (error) return { erro: "Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos.", email };
  return { ok: true, email };
}

export async function sair() {
  const sb = await supabaseServidor();
  await sb.auth.signOut();
  redirect("/portal");
}

export async function responderDecisao(projetoId: string, decisaoId: string, acao: "aprovada" | "ajuste" | "aberta", comentario: string) {
  const sb = await supabaseServidor();
  const { error } = await sb.rpc("responder_decisao", { d: decisaoId, acao, comentario: comentario.slice(0, 2000) });
  if (error) return { erro: "Não foi possível salvar. Tente de novo." };
  revalidatePath(`/portal/${projetoId}`);
  return { ok: true };
}
