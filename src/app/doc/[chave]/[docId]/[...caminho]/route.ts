import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { chaveValida } from "@/lib/token-doc";
import { injetarRuntime } from "@/lib/docs-runtime";

// Entrega os arquivos de um documento do projeto (página e imagens) guardados no bucket privado.
// Quem pede é o quadro isolado do portal, que não manda cookies: a autorização vem da chave
// assinada no endereço, criada pelo portal depois de conferir o acesso de quem está logado.
const SANDBOX =
  "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-downloads";

const erro = (status: number, txt: string) =>
  new Response(txt, { status, headers: { "content-type": "text/plain; charset=utf-8", "referrer-policy": "no-referrer" } });

export async function GET(_req: NextRequest, ctx: RouteContext<"/doc/[chave]/[docId]/[...caminho]">) {
  const { chave, docId, caminho } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(docId) || !chaveValida(chave, docId))
    return erro(403, "Este link expirou. Volte ao portal e abra o documento de novo.");

  const rel = caminho.map((c) => decodeURIComponent(c)).join("/");
  if (!rel || rel.split("/").some((p) => p === ".." || p === "." || p === "")) return erro(400, "Caminho inválido.");

  const adm = supabaseAdmin();
  const { data: doc } = await adm.from("documentos_projeto").select("projeto_id").eq("id", docId).maybeSingle();
  if (!doc) return erro(404, "Documento não encontrado.");
  const caminhoStorage = `${doc.projeto_id}/${docId}/${rel}`;

  if (rel === "index.html") {
    const { data, error } = await adm.storage.from("documentos").download(caminhoStorage);
    if (error || !data) return erro(404, "Documento não encontrado.");
    const html = injetarRuntime(await data.text());
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-security-policy": SANDBOX,
        "referrer-policy": "no-referrer",
        "cache-control": "private, no-store",
        "x-robots-tag": "noindex",
      },
    });
  }

  // Imagens, vídeos e scripts: endereço temporário direto do Storage (não passa pelo servidor do site).
  const { data } = await adm.storage.from("documentos").createSignedUrl(caminhoStorage, 60 * 60);
  if (!data?.signedUrl) return erro(404, "Arquivo não encontrado.");
  return new Response(null, {
    status: 302,
    headers: { location: data.signedUrl, "referrer-policy": "no-referrer", "cache-control": "private, max-age=1800" },
  });
}
