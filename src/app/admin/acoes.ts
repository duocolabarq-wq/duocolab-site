"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sessao } from "@/lib/supabase/server";

// Campos que a equipe pode editar em cada tabela (o resto é ignorado).
const CAMPOS: Record<string, string[]> = {
  etapas: ["nome", "status", "periodo", "itens"],
  marcos: ["valor", "rotulo", "proximo"],
  decisoes: ["titulo", "descricao", "prazo", "status", "lida_pela_equipe"],
  documentos: ["titulo", "data", "url"],
  reunioes: ["titulo", "descricao", "data"],
  links: ["tipo", "titulo", "url"],
  compras: ["categoria", "item", "fornecedor", "status"],
  ambientes: ["titulo", "imagem_url"],
  pessoas_projeto: ["nome", "papel"],
};
const COM_ORDEM = new Set(["etapas", "marcos", "decisoes", "reunioes", "links", "ambientes", "pessoas_projeto"]);

async function equipeOuSai() {
  const s = await sessao();
  if (!s.user || !s.equipe) redirect("/portal");
  return s.sb;
}

async function tocar(sb: Awaited<ReturnType<typeof equipeOuSai>>, id: string) {
  await sb.from("projetos").update({ atualizado_em: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/admin/${id}`);
  revalidatePath(`/portal/${id}`);
}

export async function criarProjeto(form: FormData) {
  const sb = await equipeOuSai();
  const v = (k: string) => String(form.get(k) ?? "").trim();
  const { data, error } = await sb
    .from("projetos").insert({ codigo: v("codigo"), titulo: v("titulo"), cliente: v("cliente") }).select("id").single();
  if (error) redirect(`/admin?erro=${encodeURIComponent(error.code === "23505" ? "Esse código já existe." : "Não foi possível criar.")}`);
  redirect(`/admin/${data.id}`);
}

export type Resultado = { ok?: boolean; erro?: string; quando?: number };

export async function salvarDados(id: string, dados: Record<string, string | number | boolean>): Promise<Resultado> {
  const sb = await equipeOuSai();
  const permitidos = ["codigo", "titulo", "cliente", "subtitulo", "servico", "status", "capa_url", "vistorias_feitas",
    "vistorias_contratadas", "vistorias_texto", "observacao_documentos", "arquivado"];
  const limpo = Object.fromEntries(Object.entries(dados).filter(([k]) => permitidos.includes(k)));
  const { error } = await sb.from("projetos").update(limpo).eq("id", id);
  if (error) return { erro: error.message };
  await tocar(sb, id);
  return { ok: true, quando: Date.now() };
}

export async function salvarAcessos(id: string, emails: string[]): Promise<Resultado> {
  const sb = await equipeOuSai();
  const lista = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => /^\S+@\S+\.\S+$/.test(e)))];
  await sb.from("acessos").delete().eq("projeto_id", id);
  if (lista.length) {
    const { error } = await sb.from("acessos").insert(lista.map((email) => ({ projeto_id: id, email })));
    if (error) return { erro: error.message };
  }
  revalidatePath(`/admin/${id}`);
  return { ok: true, quando: Date.now() };
}

export async function salvarLista(id: string, tabela: string, linhas: Record<string, unknown>[]): Promise<Resultado> {
  const sb = await equipeOuSai();
  const campos = CAMPOS[tabela];
  if (!campos) return { erro: "Seção inválida." };

  const rows = linhas.map((l, i) => {
    const r: Record<string, unknown> = { projeto_id: id };
    if (typeof l.id === "string" && l.id) r.id = l.id;
    for (const c of campos) if (c in l) r[c] = l[c] === "" && c === "data" ? null : l[c];
    if (COM_ORDEM.has(tabela)) r.ordem = i;
    return r;
  });

  const { data: atuais } = await sb.from(tabela).select("id").eq("projeto_id", id);
  const manter = new Set(rows.map((r) => r.id).filter(Boolean));
  const apagar = (atuais ?? []).map((a: { id: string }) => a.id).filter((x) => !manter.has(x));
  if (apagar.length) await sb.from(tabela).delete().in("id", apagar);

  const comId = rows.filter((r) => r.id), semId = rows.filter((r) => !r.id);
  if (comId.length) {
    const { error } = await sb.from(tabela).upsert(comId);
    if (error) return { erro: error.message };
  }
  if (semId.length) {
    const { error } = await sb.from(tabela).insert(semId);
    if (error) return { erro: error.message };
  }
  await tocar(sb, id);
  return { ok: true, quando: Date.now() };
}

export async function apagarProjeto(id: string) {
  const sb = await equipeOuSai();
  await sb.from("projetos").delete().eq("id", id);
  redirect("/admin");
}

export async function salvarEquipe(pessoas: { email: string; nome: string }[]): Promise<Resultado> {
  const s = await sessao();
  if (!s.user || !s.equipe) redirect("/portal");
  const lista = pessoas
    .map((p) => ({ email: p.email.trim().toLowerCase(), nome: p.nome.trim() || p.email.trim() }))
    .filter((p) => /^\S+@\S+\.\S+$/.test(p.email));
  if (!lista.some((p) => p.email === s.user!.email?.toLowerCase()))
    return { erro: "Você não pode remover o seu próprio e-mail da equipe." };
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  const adm = supabaseAdmin();
  const { data: atuais } = await adm.from("equipe").select("email");
  const manter = new Set(lista.map((p) => p.email));
  const sair = (atuais ?? []).map((a) => a.email).filter((e) => !manter.has(e.toLowerCase()));
  if (sair.length) await adm.from("equipe").delete().in("email", sair);
  const { error } = await adm.from("equipe").upsert(lista);
  if (error) return { erro: error.message };
  revalidatePath("/admin/equipe");
  return { ok: true, quando: Date.now() };
}

/** Depois de a equipe enviar ou mudar documentos do projeto (feito direto no navegador). */
export async function revalidarDocs(id: string) {
  const sb = await equipeOuSai();
  await tocar(sb, id);
}
