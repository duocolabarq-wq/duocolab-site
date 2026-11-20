"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";
import { TIPOS_DOC, type DocProjeto, type TipoDoc } from "@/lib/tipos";
import { revalidarDocs } from "../acoes";

const TIPOS_MIME: Record<string, string> = {
  html: "text/html", js: "text/javascript", css: "text/css", json: "application/json", svg: "image/svg+xml",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", mp4: "video/mp4", pdf: "application/pdf",
};

/** Caminho do arquivo dentro do documento: sem a pasta escolhida no topo (pasta/img/x.jpg vira img/x.jpg). */
function relativo(f: File) {
  const r = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
  const partes = r.split("/");
  return partes.length > 1 ? partes.slice(1).join("/") : r;
}

async function listar(sb: ReturnType<typeof supabaseNavegador>, pasta: string): Promise<string[]> {
  const { data } = await sb.storage.from("documentos").list(pasta, { limit: 1000 });
  const out: string[] = [];
  for (const it of data ?? []) {
    const c = `${pasta}/${it.name}`;
    if (it.id === null) out.push(...(await listar(sb, c)));
    else out.push(c);
  }
  return out;
}

async function enviarArquivos(projetoId: string, docId: string, arquivos: File[], aviso: (t: string) => void) {
  const sb = supabaseNavegador();
  let n = 0;
  for (const f of arquivos) {
    const rel = relativo(f);
    if (rel.split("/").some((p) => p.startsWith("."))) continue; // .DS_Store etc.
    const ext = rel.split(".").pop()?.toLowerCase() ?? "";
    const { error } = await sb.storage.from("documentos").upload(`${projetoId}/${docId}/${rel}`, f, {
      upsert: true, contentType: f.type || TIPOS_MIME[ext] || "application/octet-stream",
    });
    if (error) throw new Error(`${rel}: ${error.message}`);
    aviso(`Enviando arquivos… ${++n} de ${arquivos.length}`);
  }
}

const temIndex = (l: File[]) => l.some((f) => relativo(f) === "index.html");

function Arquivos({ onChange }: { onChange: (l: File[]) => void }) {
  return (
    <div className="campo largo">
      <label className="rot">Arquivos do documento</label>
      <input type="file" multiple
        // @ts-expect-error: atributo de navegador para escolher uma pasta inteira
        webkitdirectory="" onChange={(e) => onChange([...(e.target.files ?? [])])} />
      <small style={{ color: "var(--suave)" }}>
        Escolha a pasta do documento: ela precisa ter o <b>index.html</b> e as pastas de imagens (img/…) ao lado dele.
      </small>
    </div>
  );
}

export function EditorDocumentos({ projetoId, iniciais }: { projetoId: string; iniciais: DocProjeto[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [novo, setNovo] = useState({ tipo: "guia" as TipoDoc, subtitulo: "", versao: "", data: "" });
  const [arqs, setArqs] = useState<File[]>([]);
  const [ocupado, setOcupado] = useState(false);

  async function criar() {
    if (!temIndex(arqs)) return setMsg("A pasta escolhida não tem um index.html na raiz.");
    setOcupado(true); setMsg("Criando documento…");
    const sb = supabaseNavegador();
    const nome = TIPOS_DOC.find((t) => t.k === novo.tipo)!.nome;
    const { data, error } = await sb.from("documentos_projeto").insert({
      projeto_id: projetoId, tipo: novo.tipo, titulo: novo.subtitulo ? `${nome} · ${novo.subtitulo}` : nome,
      subtitulo: novo.subtitulo, versao: novo.versao, data: novo.data || null, ordem: iniciais.length,
    }).select("id").single();
    if (error) { setOcupado(false); return setMsg(`Não foi possível criar: ${error.message}`); }
    try {
      await enviarArquivos(projetoId, data.id, arqs, setMsg);
    } catch (e) {
      await sb.from("documentos_projeto").delete().eq("id", data.id);
      setOcupado(false);
      return setMsg(`Falhou ao enviar ${(e as Error).message}. Nada foi publicado.`);
    }
    await revalidarDocs(projetoId);
    setArqs([]); setNovo({ tipo: "guia", subtitulo: "", versao: "", data: "" });
    setMsg("✓ Documento publicado no portal."); setOcupado(false);
    router.refresh();
  }

  return (
    <details className="cartao adm-sec" open>
      <summary><h3>Documentos do projeto</h3></summary>
      <div className="adm-corpo">
        <p className="vazio">Guias, andamento, cadernos e conferências que o cliente abre no portal. O painel interno fica visível só para a equipe.</p>
        {iniciais.map((d) => <ItemDoc key={d.id} d={d} projetoId={projetoId} />)}
        <div className="adm-item">
          <div className="campo largo"><span className="rot">Novo documento</span></div>
          <div className="campo"><label className="rot">Tipo</label>
            <select value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value as TipoDoc })}>
              {TIPOS_DOC.map((t) => <option key={t.k} value={t.k}>{t.nome}</option>)}
            </select></div>
          <div className="campo"><label className="rot">Nome no portal</label>
            <input value={novo.subtitulo} placeholder="Esquadrias" onChange={(e) => setNovo({ ...novo, subtitulo: e.target.value })} /></div>
          <div className="campo"><label className="rot">Versão</label>
            <input value={novo.versao} placeholder="R02" onChange={(e) => setNovo({ ...novo, versao: e.target.value })} /></div>
          <div className="campo"><label className="rot">Data</label>
            <input type="date" value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} /></div>
          <Arquivos onChange={setArqs} />
          <div className="adm-ctrl">
            {arqs.length > 0 && <span className="vazio">{arqs.length} arquivos{temIndex(arqs) ? "" : " · falta o index.html"}</span>}
            <button type="button" className="adm-add" disabled={ocupado || !arqs.length} onClick={criar}>Publicar documento</button>
          </div>
        </div>
        {msg && <p className={msg.startsWith("✓") ? "ok-msg" : "vazio"}>{msg}</p>}
      </div>
    </details>
  );
}

function ItemDoc({ d, projetoId }: { d: DocProjeto; projetoId: string }) {
  const router = useRouter();
  const [v, setV] = useState({ tipo: d.tipo, subtitulo: d.subtitulo, versao: d.versao, data: d.data ?? "", ordem: d.ordem, so_equipe: d.so_equipe });
  const [arqs, setArqs] = useState<File[]>([]);
  const [msg, setMsg] = useState("");
  const [trocar, setTrocar] = useState(false);

  async function salvar() {
    const sb = supabaseNavegador();
    const nome = TIPOS_DOC.find((t) => t.k === v.tipo)!.nome;
    setMsg("Salvando…");
    const { error } = await sb.from("documentos_projeto").update({
      ...v, data: v.data || null, titulo: v.subtitulo ? `${nome} · ${v.subtitulo}` : nome,
    }).eq("id", d.id);
    if (error) return setMsg(error.message);
    if (arqs.length) {
      if (!temIndex(arqs)) return setMsg("A pasta escolhida não tem um index.html na raiz.");
      try {
        const antigos = await listar(sb, `${projetoId}/${d.id}`);
        await enviarArquivos(projetoId, d.id, arqs, setMsg);
        const novos = new Set(arqs.map((f) => `${projetoId}/${d.id}/${relativo(f)}`));
        const sobras = antigos.filter((c) => !novos.has(c));
        if (sobras.length) await sb.storage.from("documentos").remove(sobras);
      } catch (e) { return setMsg(`Falhou ao enviar ${(e as Error).message}`); }
      setArqs([]); setTrocar(false);
    }
    await revalidarDocs(projetoId);
    setMsg("✓ Salvo."); router.refresh();
  }

  async function apagar() {
    if (!confirm(`Apagar "${d.titulo}" do portal? Os arquivos dele também serão apagados.`)) return;
    const sb = supabaseNavegador();
    const arquivos = await listar(sb, `${projetoId}/${d.id}`);
    if (arquivos.length) await sb.storage.from("documentos").remove(arquivos);
    await sb.from("documentos_projeto").delete().eq("id", d.id);
    await revalidarDocs(projetoId);
    router.refresh();
  }

  return (
    <div className="adm-item">
      <div className="campo"><label className="rot">Tipo</label>
        <select value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value as TipoDoc })}>
          {TIPOS_DOC.map((t) => <option key={t.k} value={t.k}>{t.nome}</option>)}
        </select></div>
      <div className="campo"><label className="rot">Nome no portal</label>
        <input value={v.subtitulo} onChange={(e) => setV({ ...v, subtitulo: e.target.value })} /></div>
      <div className="campo"><label className="rot">Versão</label>
        <input value={v.versao} onChange={(e) => setV({ ...v, versao: e.target.value })} /></div>
      <div className="campo"><label className="rot">Data</label>
        <input type="date" value={v.data} onChange={(e) => setV({ ...v, data: e.target.value })} /></div>
      <div className="campo"><label className="rot">Ordem</label>
        <input type="number" value={v.ordem} onChange={(e) => setV({ ...v, ordem: Number(e.target.value) })} /></div>
      <label className="check"><input type="checkbox" checked={v.so_equipe || v.tipo === "painel"} disabled={v.tipo === "painel"}
        onChange={(e) => setV({ ...v, so_equipe: e.target.checked })} /> Só a equipe vê</label>
      {trocar && <Arquivos onChange={setArqs} />}
      <div className="adm-ctrl">
        {msg && <span className={msg.startsWith("✓") ? "ok-msg" : "vazio"}>{msg}</span>}
        <a className="adm-add" href={`/portal/${projetoId}/documentos/${d.id}`} target="_blank" rel="noopener">Ver</a>
        {!trocar && <button type="button" onClick={() => setTrocar(true)}>Substituir arquivos</button>}
        <button type="button" onClick={salvar}>Salvar</button>
        <button type="button" className="apaga" onClick={apagar}>Apagar</button>
      </div>
    </div>
  );
}
