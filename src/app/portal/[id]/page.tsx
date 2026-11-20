import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraPortal } from "@/components/BarraPortal";
import { carregarProjeto, dataBR } from "@/lib/dados";
import { sessao } from "@/lib/supabase/server";
import { TIPOS_DOC, nomeTipo } from "@/lib/tipos";
import { sair } from "../acoes";
import { Compras, Decisoes, Galeria, LinhaDoTempo } from "./Interativo";
import "../portal.css";

export const metadata: Metadata = { title: "Portal do projeto" };

export default async function PaginaProjeto({ params }: PageProps<"/portal/[id]">) {
  const { id } = await params;
  const { sb, equipe } = await sessao();
  const P = await carregarProjeto(sb, id);
  if (!P) notFound();

  const n = P.etapas.length || 1;
  const pct = Math.round(
    ((P.etapas.filter((e) => e.status === "ok").length + 0.5 * P.etapas.filter((e) => e.status === "and").length) / n) * 100,
  );
  const atual = P.etapas.find((e) => e.status !== "ok") ?? P.etapas.at(-1);
  const abertas = P.decisoes.filter((d) => d.status === "aberta").length;

  return (
    <>
      <BarraPortal titulo="Portal do projeto">
        {equipe && <Link className="rot" href={`/admin/${P.id}`}>Editar</Link>}
        <Link className="rot" href="/portal">Projetos</Link>
        <form action={sair}><button className="rot" type="submit">Sair</button></form>
      </BarraPortal>
      <main className="ac-wrap">
        <div className="ola">
          <div>
            <h2>Olá, {P.cliente}</h2>
            <p>Este é o portal do seu projeto. Aqui você acompanha etapas, guias, cadernos, decisões e compras num só lugar.</p>
          </div>
        </div>

        <section className="cartao capa-proj">
          {P.capa_url && <div className="ph" style={{ backgroundImage: `url(${P.capa_url})` }} />}
          <div className="in">
            <div>
              <h3>[{P.codigo}] {P.titulo}</h3>
              {P.subtitulo && <div className="sub">{P.subtitulo}</div>}
            </div>
            <div className="chips">
              <span className="chip"><i className="d" />{P.status}</span>
              {P.servico && <span className="chip">{P.servico}</span>}
              {atual && <span className="chip">{atual.nome}</span>}
              {P.etapas.length > 0 && <span className="chip pc">{pct}% concluído</span>}
            </div>
          </div>
        </section>

        {P.docs.length > 0 && (
          <section className="cartao" id="documentos">
            <div className="cab-c">
              <h3>Documentos do projeto</h3>
              <span className="rot">{P.docs.length} {P.docs.length === 1 ? "documento" : "documentos"}</span>
            </div>
            <div className="docs-grid">
              {P.docs.map((d) => (
                <Link key={d.id} className={`doc-card t-${d.tipo}`} href={`/portal/${P.id}/documentos/${d.id}`}>
                  <span className="rot">{nomeTipo(d.tipo)}{d.so_equipe && <i className="so-eq">Só equipe</i>}</span>
                  <b>{d.subtitulo || nomeTipo(d.tipo)}</b>
                  <small>{TIPOS_DOC.find((t) => t.k === d.tipo)?.desc}</small>
                  <span className="ir">
                    <span>{[d.versao, dataBR(d.data)].filter(Boolean).join(" · ")}</span>
                    <span>Abrir →</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="cartao">
          <div className="cab-c"><h3>Linha do tempo</h3></div>
          <LinhaDoTempo etapas={P.etapas} />
          {P.marcos.length > 0 && (
            <div className="marcos">
              {P.marcos.map((m, i) => (
                <div key={i} className={`marco ${m.proximo ? "next" : ""}`}><b>{m.valor}</b><span>{m.rotulo}</span></div>
              ))}
            </div>
          )}
        </section>

        <section className={`cartao ${abertas ? "decisoes" : ""}`}>
          <div className="cab-c">
            <h3>Decisões que dependem de você</h3>
            <span className={`tag ${abertas ? "pend" : "ok"}`}>{abertas ? `${abertas} em aberto` : "Tudo em dia"}</span>
          </div>
          <Decisoes projetoId={P.id} decisoes={P.decisoes} />
        </section>

        <div className="g2">
          <section className="cartao">
            <div className="cab-c">
              <h3>Visitas à obra</h3>
              {P.vistorias_contratadas > 0 && <span className="tag and">{P.vistorias_feitas} de {P.vistorias_contratadas} feitas</span>}
            </div>
            {P.vistorias_contratadas > 0 && (
              <div className="tl" style={{ marginBottom: 12 }}>
                {Array.from({ length: P.vistorias_contratadas }, (_, i) => (
                  <span key={i} className={i < P.vistorias_feitas ? "ok" : ""}><span className="bar" style={{ display: "block" }} /></span>
                ))}
              </div>
            )}
            <p style={{ fontSize: 13.5 }}>{P.vistorias_texto || "As visitas à obra aparecem aqui quando forem contratadas."}</p>
          </section>
          <section className="cartao">
            <div className="cab-c"><h3>Arquivos entregues</h3></div>
            {P.documentos.length === 0 && <p className="vazio">Nenhum arquivo entregue ainda.</p>}
            {P.documentos.map((d, i) => (
              <div key={i} className="linha-l">
                <div>{d.url ? <a href={d.url} target="_blank" rel="noopener" style={{ borderBottom: "1px solid var(--linha)" }}>{d.titulo}</a> : d.titulo}</div>
                <span className="m">{dataBR(d.data)}</span>
              </div>
            ))}
            {P.observacao_documentos && <p className="aviso">{P.observacao_documentos}</p>}
          </section>
        </div>
        <div style={{ height: 16 }} />

        <div className="g2">
          <section className="cartao">
            <div className="cab-c"><h3>Visitas e reuniões</h3></div>
            {P.reunioes.length === 0 && <p className="vazio">As reuniões aparecem aqui.</p>}
            {P.reunioes.map((r, i) => (
              <div key={i} className="linha-l"><div>{r.titulo}<small>{r.descricao}</small></div><span className="m">{r.data}</span></div>
            ))}
          </section>
          <section className="cartao">
            <div className="cab-c"><h3>Arquivos e links</h3></div>
            {P.links.length === 0 && <p className="vazio">A pasta do projeto e outros links aparecem aqui.</p>}
            <div className="lks">
              {P.links.map((l, i) => (
                <a key={i} className="lk" href={l.url} target="_blank" rel="noopener"><i>{l.tipo}</i><span>{l.titulo}</span><em>Ver</em></a>
              ))}
            </div>
          </section>
        </div>
        <div style={{ height: 16 }} />

        <section className="cartao">
          <div className="cab-c">
            <h3>Compras e fornecedores</h3>
            {P.compras.length > 0 && (
              <span className="tag ok">{P.compras.filter((c) => c.status === "ok").length} de {P.compras.length} resolvidos</span>
            )}
          </div>
          <Compras compras={P.compras} />
        </section>

        {P.ambientes.length > 0 && (
          <section className="cartao">
            <div className="cab-c"><h3>Os ambientes</h3></div>
            <Galeria ambientes={P.ambientes} />
            <p className="aviso">Imagens ilustrativas. Medidas e materiais seguem o projeto técnico na revisão mais recente.</p>
          </section>
        )}

        {P.pessoas.length > 0 && (
          <section className="cartao">
            <div className="cab-c"><h3>Sua equipe na Duo</h3></div>
            <div className="equipe-p">
              {P.pessoas.map((p, i) => (
                <div key={i} className="pp"><span className="av">{p.nome[0]}</span><div>{p.nome}<small>{p.papel}</small></div></div>
              ))}
            </div>
          </section>
        )}

        <footer className="ac-rodape">
          <img src="/img/logo_verde.png" alt="" />
          Duo Colab Arquitetura · Sala 105, Empresarial Agamenon Magalhães · Av. Agamenon Magalhães, 2656 · Espinheiro, Recife/PE
          <br />Atualizado em {new Date(P.atualizado_em).toLocaleDateString("pt-BR")}
        </footer>
      </main>
    </>
  );
}
