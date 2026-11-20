import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjetoCompleto } from "./tipos";

/** Carrega um projeto com todas as seções. Respeita as permissões (RLS) de quem está logado. */
export async function carregarProjeto(sb: SupabaseClient, id: string): Promise<ProjetoCompleto | null> {
  const { data: p } = await sb.from("projetos").select("*").eq("id", id).maybeSingle();
  if (!p) return null;
  const q = (t: string, ordem = "ordem") => sb.from(t).select("*").eq("projeto_id", id).order(ordem);
  const [et, ma, de, doc, re, li, co, am, pe, ac] = await Promise.all([
    q("etapas"), q("marcos"), q("decisoes"), q("documentos", "data"), q("reunioes"), q("links"),
    q("compras", "categoria"), q("ambientes"), q("pessoas_projeto"),
    sb.from("acessos").select("email").eq("projeto_id", id),
  ]);
  return {
    ...p,
    etapas: et.data ?? [], marcos: ma.data ?? [], decisoes: de.data ?? [],
    documentos: (doc.data ?? []).reverse(), reunioes: re.data ?? [], links: li.data ?? [],
    compras: co.data ?? [], ambientes: am.data ?? [], pessoas: pe.data ?? [],
    acessos: (ac.data ?? []).map((a: { email: string }) => a.email),
  };
}

export const dataBR = (d: string | null) => (d ? d.split("-").reverse().join("/") : "");
