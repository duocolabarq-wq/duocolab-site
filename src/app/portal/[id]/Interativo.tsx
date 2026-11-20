"use client";
import { useState, useTransition } from "react";
import type { Ambiente, Compra, Decisao, Etapa } from "@/lib/tipos";
import { TAG_TXT } from "@/lib/tipos";
import { responderDecisao } from "../acoes";

export function LinhaDoTempo({ etapas }: { etapas: Etapa[] }) {
  const atual = Math.max(0, etapas.findIndex((e) => e.status !== "ok"));
  const [sel, setSel] = useState(atual);
  if (!etapas.length) return <p className="vazio">As etapas aparecem aqui assim que o projeto começar.</p>;
  const e = etapas[sel];
  return (
    <>
      <div className="tl">
        {etapas.map((x, i) => (
          <button key={i} type="button" className={`${x.status === "pend" ? "" : x.status} ${i === sel ? "sel" : ""}`} onClick={() => setSel(i)} aria-label={x.nome}>
            <span className="bar" /><span className="nome">{x.nome}</span>
          </button>
        ))}
      </div>
      <div className="cur">Etapa atual: <b>{etapas[atual].nome}</b> · toque numa barra para ver cada etapa</div>
      <div className="stepbox">
        <div className="dt">Etapa {sel + 1} de {etapas.length}{e.periodo ? ` · ${e.periodo}` : ""}</div>
        <div className="t">{e.nome} <span className={`tag ${e.status}`}>{TAG_TXT[e.status]}</span></div>
        {e.itens?.length > 0 && <ul>{e.itens.map((t, i) => <li key={i}>{t}</li>)}</ul>}
      </div>
    </>
  );
}

function UmaDecisao({ projetoId, d }: { projetoId: string; d: Decisao }) {
  const [comentando, setComentando] = useState(false);
  const [txt, setTxt] = useState("");
  const [erro, setErro] = useState("");
  const [pend, start] = useTransition();
  const enviar = (acao: "aprovada" | "ajuste" | "aberta", c = "") =>
    start(async () => {
      const r = await responderDecisao(projetoId, d.id, acao, c);
      setErro(r.erro ?? "");
      if (!r.erro) setComentando(false);
    });
  const feito = d.status !== "aberta";
  return (
    <div className={`dec ${feito ? "feito" : ""} ${comentando ? "comentando" : ""}`}>
      <div className="topo-dec">
        <h4>{d.titulo}</h4>
        {d.prazo && !feito && <span className="prazo">{d.prazo}</span>}
      </div>
      {d.descricao && <p>{d.descricao}</p>}
      {feito ? (
        <>
          <div className="status" style={{ display: "flex" }}>
            <span>
              {d.status === "aprovada" ? "✓ Aprovado" : d.status === "ajuste" ? "✎ Ajuste pedido" : "✓ Resolvido"}
              {d.respondido_em && ` em ${new Date(d.respondido_em).toLocaleDateString("pt-BR")}`}
            </span>
            {d.status !== "resolvida" && <button type="button" disabled={pend} onClick={() => enviar("aberta")}>Desfazer</button>}
          </div>
          {d.resposta && <div className="resp">“{d.resposta}”</div>}
        </>
      ) : (
        <>
          <div className="coment">
            <textarea value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="O que você gostaria de ajustar?" />
            <div className="acoes" style={{ display: "flex" }}>
              <button type="button" disabled={pend || !txt.trim()} onClick={() => enviar("ajuste", txt)}>Enviar pedido de ajuste</button>
              <button type="button" onClick={() => setComentando(false)}>Cancelar</button>
            </div>
          </div>
          {!comentando && (
            <div className="acoes">
              <button type="button" className="aprovar" disabled={pend} onClick={() => enviar("aprovada")}>{pend ? "Salvando..." : "Aprovar"}</button>
              <button type="button" disabled={pend} onClick={() => setComentando(true)}>Pedir ajuste</button>
            </div>
          )}
        </>
      )}
      {erro && <p className="erro">{erro}</p>}
    </div>
  );
}

export function Decisoes({ projetoId, decisoes }: { projetoId: string; decisoes: Decisao[] }) {
  if (!decisoes.length) return <p className="vazio">Nada pendente com você agora. 🎉</p>;
  return <div className="dec-grid">{decisoes.map((d) => <UmaDecisao key={d.id} projetoId={projetoId} d={d} />)}</div>;
}

export function Compras({ compras }: { compras: Compra[] }) {
  const cats = [...new Set(compras.map((c) => c.categoria))];
  const [sel, setSel] = useState<string | null>(null);
  if (!compras.length)
    return <p className="vazio">A lista de compras e orçamentos começa quando a obra for orçada. Assim que tivermos os primeiros fornecedores, eles aparecem aqui, item por item.</p>;
  return (
    <>
      <div className="cats">
        {cats.map((c) => {
          const it = compras.filter((x) => x.categoria === c);
          const k = it.filter((x) => x.status === "ok").length;
          return (
            <button key={c} type="button" className={`cat ${sel === c ? "on" : ""}`} onClick={() => setSel(sel === c ? null : c)}>
              <small>{it.length} {it.length > 1 ? "itens" : "item"}</small><b>{c}</b>
              <div className="p"><i style={{ width: `${(k / it.length) * 100}%` }} /></div>
              <div className="n">{k}/{it.length} resolvidos</div>
            </button>
          );
        })}
      </div>
      {sel && (
        <div style={{ marginTop: 12 }}>
          {compras.filter((x) => x.categoria === sel).map((x, i) => (
            <div key={i} className="linha-l">
              <div>{x.item}<small>{x.fornecedor}</small></div>
              <span className={`tag ${x.status}`}>{x.status === "ok" ? "Resolvido" : TAG_TXT[x.status]}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function Galeria({ ambientes }: { ambientes: Ambiente[] }) {
  const [aberta, setAberta] = useState<Ambiente | null>(null);
  return (
    <>
      <div className="gal">
        {ambientes.map((a, i) => (
          <button key={i} type="button" onClick={() => setAberta(a)}>
            <img src={a.imagem_url} alt={a.titulo} loading="lazy" /><span>{a.titulo}</span>
          </button>
        ))}
      </div>
      {aberta && (
        <div className="lb" onClick={() => setAberta(null)} role="dialog" aria-label={aberta.titulo}>
          <img src={aberta.imagem_url} alt={aberta.titulo} /><p className="rot">{aberta.titulo} · toque para fechar</p>
        </div>
      )}
    </>
  );
}
