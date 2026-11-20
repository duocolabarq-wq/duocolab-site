import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraPortal } from "@/components/BarraPortal";
import { carregarProjeto, dataBR } from "@/lib/dados";
import { sessao } from "@/lib/supabase/server";
import { chaveDoc } from "@/lib/token-doc";
import { nomeTipo, type DocProjeto } from "@/lib/tipos";
import { sair } from "../../../acoes";
import { Visor } from "./Visor";
import "../../../portal.css";

export const metadata: Metadata = { title: "Documento do projeto" };

/** Nome curto do documento na barra: o tipo, e o subtítulo quando há mais de um do mesmo tipo. */
function rotulo(d: DocProjeto, todos: DocProjeto[]) {
  const n = nomeTipo(d.tipo);
  return todos.filter((x) => x.tipo === d.tipo).length > 1 && d.subtitulo ? `${n} · ${d.subtitulo}` : n;
}

export default async function PaginaDocumento({ params }: PageProps<"/portal/[id]/documentos/[docId]">) {
  const { id, docId } = await params;
  const { sb, user, equipe } = await sessao();
  const P = await carregarProjeto(sb, id);
  const doc = P?.docs.find((d) => d.id === docId);
  if (!P || !doc || !user) notFound();

  let meuNome = user.email ?? "";
  if (equipe) {
    const { data } = await sb.from("equipe").select("nome").ilike("email", user.email ?? "").maybeSingle();
    if (data?.nome) meuNome = data.nome;
  }

  const i = P.docs.indexOf(doc);
  const ant = P.docs[i - 1], prox = P.docs[i + 1];
  const src = `/doc/${chaveDoc(doc.id)}/${doc.id}/index.html`;
  const meta = [doc.versao, dataBR(doc.data)].filter(Boolean).join(" · ");

  return (
    <div className="doc-pagina">
      <BarraPortal titulo="Portal do projeto">
        {equipe && <Link className="rot esconde-cel" href={`/admin/${P.id}`}>Editar</Link>}
        <Link className="rot esconde-cel" href="/portal">Projetos</Link>
        <form action={sair}><button className="rot" type="submit">Sair</button></form>
      </BarraPortal>

      <nav className="doc-nav" aria-label="Documentos do projeto">
        <Link className="doc-volta" href={`/portal/${P.id}`}>
          <span aria-hidden>←</span> <span><small className="rot">{P.codigo}</small>{P.titulo}</span>
        </Link>
        <div className="doc-abas">
          {P.docs.map((d) => (
            <Link key={d.id} href={`/portal/${P.id}/documentos/${d.id}`} className={`doc-aba ${d.id === doc.id ? "on" : ""}`}
              aria-current={d.id === doc.id ? "page" : undefined} scroll={false}>
              {rotulo(d, P.docs)}{d.so_equipe && <i className="so-eq">Equipe</i>}
            </Link>
          ))}
        </div>
      </nav>

      <div className="doc-info">
        <div>
          <span className="rot">{nomeTipo(doc.tipo)}{meta && ` · ${meta}`}</span>
          {doc.so_equipe && <span className="tag pend">Só a equipe vê</span>}
        </div>
        <div className="doc-passos">
          {ant && <Link href={`/portal/${P.id}/documentos/${ant.id}`} scroll={false}>← {rotulo(ant, P.docs)}</Link>}
          {prox && <Link href={`/portal/${P.id}/documentos/${prox.id}`} scroll={false}>{rotulo(prox, P.docs)} →</Link>}
          <a href={src} target="_blank" rel="noopener">Abrir em tela cheia ↗</a>
        </div>
      </div>

      <Visor key={doc.id} src={src} titulo={doc.titulo} docId={doc.id} equipe={equipe} userId={user.id} meuNome={meuNome}
        outros={P.docs.map((d) => ({ id: d.id, origem: d.origem }))} projetoId={P.id} />
    </div>
  );
}
