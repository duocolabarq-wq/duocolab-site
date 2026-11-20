"use client";
import { useState, useTransition } from "react";
import { supabaseNavegador } from "@/lib/supabase/client";
import { apagarProjeto, salvarAcessos, salvarDados, salvarLista, type Resultado } from "../acoes";

type Tipo = "texto" | "area" | "linhas" | "status" | "statusDec" | "data" | "check" | "imagem";
export type Campo = { k: string; rotulo: string; tipo?: Tipo; largo?: boolean; dica?: string };
type Linha = Record<string, unknown>;

const OPC: Record<string, [string, string][]> = {
  status: [["pend", "Pendente"], ["and", "Em andamento"], ["ok", "Concluído"]],
  statusDec: [["aberta", "Aguardando o cliente"], ["aprovada", "Aprovada"], ["ajuste", "Ajuste pedido"], ["resolvida", "Resolvida pela equipe"]],
};

async function subirImagem(projetoId: string, arquivo: File) {
  const sb = supabaseNavegador();
  const ext = arquivo.name.split(".").pop()?.toLowerCase() || "jpg";
  const caminho = `${projetoId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await sb.storage.from("projetos").upload(caminho, arquivo, { contentType: arquivo.type });
  if (error) throw error;
  return sb.storage.from("projetos").getPublicUrl(caminho).data.publicUrl;
}

function Aviso({ r, pend }: { r: Resultado | null; pend: boolean }) {
  if (pend) return <span className="rot" style={{ color: "var(--suave)" }}>Salvando...</span>;
  if (r?.erro) return <span className="erro">{r.erro}</span>;
  if (r?.ok) return <span className="ok-msg">✓ Salvo. O cliente já vê a atualização.</span>;
  return null;
}

function CampoEd({ c, v, set, projetoId }: { c: Campo; v: unknown; set: (x: unknown) => void; projetoId: string }) {
  const [subindo, setSubindo] = useState(false);
  const id = `${c.k}-${Math.random().toString(36).slice(2, 7)}`;
  const cls = `campo ${c.largo || c.tipo === "area" || c.tipo === "linhas" ? "largo" : ""}`;
  if (c.tipo === "check")
    return <label className="check"><input type="checkbox" checked={Boolean(v)} onChange={(e) => set(e.target.checked)} /> {c.rotulo}</label>;
  if (c.tipo === "status" || c.tipo === "statusDec")
    return (
      <div className={cls}><label className="rot" htmlFor={id}>{c.rotulo}</label>
        <select id={id} value={String(v ?? OPC[c.tipo][0][0])} onChange={(e) => set(e.target.value)}>
          {OPC[c.tipo].map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select></div>
    );
  if (c.tipo === "imagem")
    return (
      <div className={cls}><label className="rot">{c.rotulo}</label>
        {typeof v === "string" && v && <img className="adm-thumb" src={v} alt="" />}
        <input type="file" accept="image/*" disabled={subindo} onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          setSubindo(true);
          try { set(await subirImagem(projetoId, f)); } catch { alert("Não foi possível enviar a imagem."); }
          setSubindo(false);
        }} />
        {subindo && <small>Enviando imagem...</small>}
      </div>
    );
  const valor = c.tipo === "linhas" ? (Array.isArray(v) ? v.join("\n") : "") : String(v ?? "");
  const muda = (x: string) => set(c.tipo === "linhas" ? x.split("\n") : x);
  return (
    <div className={cls}><label className="rot" htmlFor={id}>{c.rotulo}</label>
      {c.tipo === "area" || c.tipo === "linhas"
        ? <textarea id={id} value={valor} onChange={(e) => muda(e.target.value)} placeholder={c.dica} />
        : <input id={id} type={c.tipo === "data" ? "date" : "text"} value={valor} onChange={(e) => muda(e.target.value)} placeholder={c.dica} />}
    </div>
  );
}

export function EditorLista({ projetoId, tabela, titulo, campos, iniciais, novo, aberto, extra }: {
  projetoId: string; tabela: string; titulo: string; campos: Campo[]; iniciais: Linha[]; novo: Linha; aberto?: boolean;
  extra?: (l: Linha, set: (k: string, v: unknown) => void) => React.ReactNode;
}) {
  const [linhas, setLinhas] = useState<Linha[]>(iniciais);
  const [r, setR] = useState<Resultado | null>(null);
  const [pend, start] = useTransition();
  const muda = (i: number, k: string, v: unknown) => { setR(null); setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l))); };
  const move = (i: number, d: number) => setLinhas((ls) => { const n = [...ls]; const j = i + d; if (j < 0 || j >= n.length) return ls; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const salvar = () => start(async () => {
    const limpas = linhas.map((l) => (Array.isArray(l.itens) ? { ...l, itens: (l.itens as string[]).map((x) => x.trim()).filter(Boolean) } : l));
    setR(await salvarLista(projetoId, tabela, limpas));
  });
  return (
    <details className="cartao adm-sec" open={aberto}>
      <summary><h3>{titulo} <small className="rot" style={{ color: "var(--suave)" }}>· {linhas.length}</small></h3></summary>
      <div className="adm-corpo">
        {linhas.map((l, i) => (
          <div key={(l.id as string) ?? `n${i}`} className="adm-item">
            {campos.map((c) => <CampoEd key={c.k} c={c} v={l[c.k]} set={(v) => muda(i, c.k, v)} projetoId={projetoId} />)}
            {extra?.(l, (k, v) => muda(i, k, v))}
            <div className="adm-ctrl">
              <button type="button" onClick={() => move(i, -1)}>↑ Subir</button>
              <button type="button" onClick={() => move(i, 1)}>↓ Descer</button>
              <button type="button" className="apaga" onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}>Remover</button>
            </div>
          </div>
        ))}
        <button type="button" className="adm-add" onClick={() => setLinhas((ls) => [...ls, { ...novo }])}>+ Adicionar</button>
        <div className="adm-salvar">
          <button type="button" className="btn verde" disabled={pend} onClick={salvar}>Salvar {titulo.toLowerCase()}</button>
          <Aviso r={r} pend={pend} />
        </div>
      </div>
    </details>
  );
}

export function EditorDados({ projetoId, iniciais }: { projetoId: string; iniciais: Record<string, string | number | boolean> }) {
  const [d, setD] = useState(iniciais);
  const [r, setR] = useState<Resultado | null>(null);
  const [pend, start] = useTransition();
  const set = (k: string) => (v: unknown) => { setR(null); setD((x) => ({ ...x, [k]: v as string })); };
  const campos: Campo[] = [
    { k: "codigo", rotulo: "Código" }, { k: "titulo", rotulo: "Nome do projeto" }, { k: "cliente", rotulo: "Cliente (como cumprimentar)" },
    { k: "status", rotulo: "Status", dica: "Em andamento" }, { k: "servico", rotulo: "Serviço", dica: "Arquitetura + executivo" },
    { k: "subtitulo", rotulo: "Local e descrição", largo: true },
    { k: "vistorias_texto", rotulo: "Texto sobre as visitas à obra", tipo: "area" },
    { k: "observacao_documentos", rotulo: "Observação dos documentos", tipo: "area" },
    { k: "capa_url", rotulo: "Imagem de capa", tipo: "imagem" },
  ];
  return (
    <details className="cartao adm-sec" open>
      <summary><h3>Dados do projeto</h3></summary>
      <div className="adm-corpo">
        <div className="adm-grid">
          {campos.map((c) => <CampoEd key={c.k} c={c} v={d[c.k]} set={set(c.k)} projetoId={projetoId} />)}
          <div className="campo"><label className="rot">Visitas à obra feitas</label>
            <input type="number" min={0} value={Number(d.vistorias_feitas)} onChange={(e) => set("vistorias_feitas")(Number(e.target.value))} /></div>
          <div className="campo"><label className="rot">Visitas contratadas</label>
            <input type="number" min={0} value={Number(d.vistorias_contratadas)} onChange={(e) => set("vistorias_contratadas")(Number(e.target.value))} /></div>
          <CampoEd c={{ k: "arquivado", rotulo: "Arquivar (o cliente deixa de ver)", tipo: "check" }} v={d.arquivado} set={set("arquivado")} projetoId={projetoId} />
        </div>
        <div className="adm-salvar">
          <button type="button" className="btn verde" disabled={pend} onClick={() => start(async () => setR(await salvarDados(projetoId, d)))}>Salvar dados</button>
          <Aviso r={r} pend={pend} />
        </div>
      </div>
    </details>
  );
}

export function EditorAcessos({ projetoId, iniciais }: { projetoId: string; iniciais: string[] }) {
  const [txt, setTxt] = useState(iniciais.join("\n"));
  const [r, setR] = useState<Resultado | null>(null);
  const [pend, start] = useTransition();
  return (
    <details className="cartao adm-sec" open={iniciais.length === 0}>
      <summary><h3>Quem acessa <small className="rot" style={{ color: "var(--suave)" }}>· {iniciais.length}</small></h3></summary>
      <div className="adm-corpo">
        <p className="vazio">Um e-mail por linha. Essas pessoas entram em duocolab.com.br/portal com o próprio e-mail e recebem um link de acesso.</p>
        <div className="campo"><textarea value={txt} onChange={(e) => { setR(null); setTxt(e.target.value); }} placeholder={"cliente@email.com\noutra.pessoa@email.com"} /></div>
        <div className="adm-salvar">
          <button type="button" className="btn verde" disabled={pend} onClick={() => start(async () => setR(await salvarAcessos(projetoId, txt.split(/[\n,;]/))))}>Salvar acessos</button>
          <Aviso r={r} pend={pend} />
        </div>
      </div>
    </details>
  );
}

export function ApagarProjeto({ projetoId, nome }: { projetoId: string; nome: string }) {
  return (
    <button type="button" className="adm-add" style={{ color: "var(--rosa)" }} onClick={() => {
      if (prompt(`Para apagar de vez, digite o nome do projeto: ${nome}`) === nome) apagarProjeto(projetoId);
    }}>Apagar este projeto</button>
  );
}

export function RespostaCliente({ l, set }: { l: Linha; set: (k: string, v: unknown) => void }) {
  if (!l.respondido_em) return null;
  const lida = Boolean(l.lida_pela_equipe);
  return (
    <div className={`adm-resp ${lida ? "lida" : ""}`}>
      <b>{l.status === "aprovada" ? "Cliente aprovou" : l.status === "ajuste" ? "Cliente pediu ajuste" : "Resposta"}</b>
      {" "}· {String(l.respondido_por)} · {new Date(String(l.respondido_em)).toLocaleString("pt-BR")}
      {typeof l.resposta === "string" && l.resposta && <div>“{l.resposta}”</div>}
      {!lida && <div style={{ marginTop: 6 }}><button type="button" className="adm-add" onClick={() => set("lida_pela_equipe", true)}>Marcar como lida (depois salve)</button></div>}
    </div>
  );
}

export function EditorDecisoes({ projetoId, iniciais }: { projetoId: string; iniciais: Linha[] }) {
  return (
    <EditorLista projetoId={projetoId} tabela="decisoes" titulo="Decisões do cliente" iniciais={iniciais}
      aberto={iniciais.some((d) => !d.lida_pela_equipe)}
      novo={{ titulo: "", descricao: "", prazo: "", status: "aberta", lida_pela_equipe: true }}
      campos={[
        { k: "titulo", rotulo: "O que decidir", largo: true },
        { k: "descricao", rotulo: "Explicação", tipo: "area" },
        { k: "prazo", rotulo: "Prazo", dica: "Até 25/11" },
        { k: "status", rotulo: "Situação", tipo: "statusDec" },
      ]}
      extra={(l, set) => <RespostaCliente l={l} set={set} />} />
  );
}
