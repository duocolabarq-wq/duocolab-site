#!/usr/bin/env node
// Importa documentos (guias, andamento, cadernos, painéis) para o portal, em lote.
//
// Uso:
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/importar-documentos.mjs <manifesto.json> [--aplicar]
//
// Sem --aplicar, só mostra o que faria (nada é gravado).
//
// O manifesto (que tem dados de clientes e NÃO vai para o git) é uma lista assim:
// [{ "pasta": "/caminho/guia-casam",          // pasta com index.html + img/...
//    "projeto": { "codigo": "09-26", "busca": ["casa m"], "titulo": "Casa M", "cliente": "Gustavo e Rafaely" },
//    "tipo": "guia", "subtitulo": "", "versao": "", "data": "2026-11-18",
//    "origem": "https://claude.ai/artifact/..." }]
//
// O projeto é encontrado pelo código; se não houver, por um dos termos de "busca" no título.
// Se não existir, é criado (sem e-mails de acesso: a equipe libera o cliente no /admin).
// Reimportar o mesmo "origem" no mesmo projeto substitui os arquivos do documento.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const [arqManifesto, flag] = process.argv.slice(2);
const aplicar = flag === "--aplicar";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!arqManifesto || !url || !chave) {
  console.error("Uso: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/importar-documentos.mjs manifesto.json [--aplicar]");
  process.exit(1);
}
const sb = createClient(url, chave, { auth: { persistSession: false } });
const itens = JSON.parse(fs.readFileSync(arqManifesto, "utf8"));
const NOMES = { andamento: "Andamento", guia: "Guia do projeto", etapas: "Etapas da obra", perspectivas: "Perspectivas",
  marcenaria: "Marcenaria", conferencia: "Conferência", painel: "Painel interno" };
const MIME = { html: "text/html", js: "text/javascript", css: "text/css", json: "application/json", svg: "image/svg+xml",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", mp4: "video/mp4", pdf: "application/pdf" };
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function arquivos(pasta, base = pasta) {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith(".") || e.name.startsWith("_")) return [];
    const p = path.join(pasta, e.name);
    return e.isDirectory() ? arquivos(p, base) : [path.relative(base, p).split(path.sep).join("/")];
  });
}

const { data: projetos, error: e0 } = await sb.from("projetos").select("id,codigo,titulo,cliente");
if (e0) { console.error("Não consegui ler os projetos:", e0.message); process.exit(1); }

const criados = new Map();
async function acharProjeto(pj) {
  const porCodigo = pj.codigo && projetos.find((p) => norm(p.codigo) === norm(pj.codigo));
  if (porCodigo) return { p: porCodigo, como: "código" };
  const termos = (pj.busca ?? []).map(norm);
  const achados = projetos.filter((p) => termos.some((t) => norm(`${p.titulo} ${p.cliente}`).includes(t)));
  if (achados.length === 1) return { p: achados[0], como: "título" };
  if (achados.length > 1) return { erro: `mais de um projeto combina com ${JSON.stringify(pj.busca)}: ${achados.map((a) => a.codigo).join(", ")}` };
  const k = pj.codigo || pj.titulo;
  if (criados.has(k)) return { p: criados.get(k), como: "criado agora" };
  if (!aplicar) return { p: { id: "(novo)", codigo: pj.codigo, titulo: pj.titulo }, como: "SERÁ CRIADO" };
  const { data, error } = await sb.from("projetos")
    .insert({ codigo: pj.codigo || `DOC-${Date.now().toString(36)}`, titulo: pj.titulo, cliente: pj.cliente || pj.titulo })
    .select("id,codigo,titulo,cliente").single();
  if (error) return { erro: `não consegui criar o projeto ${pj.titulo}: ${error.message}` };
  projetos.push(data); criados.set(k, data);
  return { p: data, como: "criado agora" };
}

let falhas = 0;
for (const it of itens) {
  const lista = arquivos(it.pasta);
  const rot = `${NOMES[it.tipo] ?? it.tipo}${it.subtitulo ? " · " + it.subtitulo : ""}`;
  if (!lista.includes("index.html")) { console.log(`✗ ${it.pasta}: sem index.html`); falhas++; continue; }
  const achou = await acharProjeto(it.projeto);
  if (achou.erro) { console.log(`✗ ${rot}: ${achou.erro}`); falhas++; continue; }
  const { p, como } = achou;
  console.log(`${aplicar ? "→" : "·"} [${p.codigo}] ${p.titulo} (${como}) ← ${rot} · ${lista.length} arquivos`);
  if (!aplicar) continue;

  const { data: existente } = it.origem
    ? await sb.from("documentos_projeto").select("id").eq("projeto_id", p.id).eq("origem", it.origem).maybeSingle()
    : { data: null };
  const linha = { projeto_id: p.id, tipo: it.tipo, titulo: rot, subtitulo: it.subtitulo ?? "", versao: it.versao ?? "",
    data: it.data || null, so_equipe: it.tipo === "painel" || Boolean(it.so_equipe), ordem: it.ordem ?? 0, origem: it.origem ?? "" };
  const { data: doc, error } = existente
    ? await sb.from("documentos_projeto").update(linha).eq("id", existente.id).select("id").single()
    : await sb.from("documentos_projeto").insert(linha).select("id").single();
  if (error) { console.log(`  ✗ ${error.message}`); falhas++; continue; }

  for (const rel of lista) {
    const corpo = fs.readFileSync(path.join(it.pasta, rel));
    const ext = rel.split(".").pop().toLowerCase();
    const { error: eu } = await sb.storage.from("documentos")
      .upload(`${p.id}/${doc.id}/${rel}`, corpo, { upsert: true, contentType: MIME[ext] ?? "application/octet-stream" });
    if (eu) { console.log(`  ✗ ${rel}: ${eu.message}`); falhas++; }
  }
  console.log(`  ✓ publicado (${doc.id})`);
}
console.log(falhas ? `\nTerminou com ${falhas} problema(s).` : aplicar ? "\nTudo importado." : "\nSimulação. Rode com --aplicar para gravar.");
process.exit(falhas ? 1 : 0);
