import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BarraPortal } from "@/components/BarraPortal";
import { carregarProjeto } from "@/lib/dados";
import { sessao } from "@/lib/supabase/server";
import { ApagarProjeto, EditorAcessos, EditorDados, EditorDecisoes, EditorLista } from "./Editores";
import "../../portal/portal.css";
import "../admin.css";

export const metadata: Metadata = { title: "Editar projeto" };

export default async function EditarProjeto({ params }: PageProps<"/admin/[id]">) {
  const { id } = await params;
  const s = await sessao();
  if (!s.user || !s.equipe) redirect("/portal");
  const P = await carregarProjeto(s.sb, id);
  if (!P) notFound();
  const { etapas, marcos, decisoes, documentos, reunioes, links, compras, ambientes, pessoas, acessos, ...dados } = P;
  const base = { projetoId: P.id };

  return (
    <>
      <BarraPortal titulo="Painel da equipe">
        <Link className="rot" href="/admin">Projetos</Link>
        <Link className="rot" href={`/portal/${P.id}`}>Ver como cliente</Link>
      </BarraPortal>
      <main className="ac-wrap">
        <div className="ola"><div><h2>[{P.codigo}] {P.titulo}</h2><p>{P.cliente}</p></div></div>

        <EditorDados projetoId={P.id} iniciais={dados as unknown as Record<string, string | number | boolean>} />
        <EditorAcessos projetoId={P.id} iniciais={acessos} />
        <EditorDecisoes projetoId={P.id} iniciais={decisoes} />

        <EditorLista {...base} tabela="etapas" titulo="Etapas" iniciais={etapas}
          novo={{ nome: "", status: "pend", periodo: "", itens: [] }}
          campos={[{ k: "nome", rotulo: "Etapa" }, { k: "status", rotulo: "Situação", tipo: "status" },
            { k: "periodo", rotulo: "Período", dica: "03 a 23/03" }, { k: "itens", rotulo: "O que aconteceu (um item por linha)", tipo: "linhas" }]} />

        <EditorLista {...base} tabela="marcos" titulo="Marcos" iniciais={marcos}
          novo={{ valor: "", rotulo: "", proximo: false }}
          campos={[{ k: "valor", rotulo: "Data ou valor", dica: "03/03" }, { k: "rotulo", rotulo: "Descrição", dica: "Contrato assinado" },
            { k: "proximo", rotulo: "É o próximo marco (destaque)", tipo: "check" }]} />

        <EditorLista {...base} tabela="documentos" titulo="Documentos" iniciais={documentos}
          novo={{ titulo: "", data: "", url: "" }}
          campos={[{ k: "titulo", rotulo: "Documento", dica: "Caderno Técnico · R07" }, { k: "data", rotulo: "Data", tipo: "data" },
            { k: "url", rotulo: "Link (opcional)", dica: "https://drive.google.com/..." }]} />

        <EditorLista {...base} tabela="reunioes" titulo="Visitas e reuniões" iniciais={reunioes}
          novo={{ titulo: "", descricao: "", data: "" }}
          campos={[{ k: "titulo", rotulo: "Reunião ou visita" }, { k: "data", rotulo: "Quando", dica: "01/10/2026" },
            { k: "descricao", rotulo: "Resumo", largo: true }]} />

        <EditorLista {...base} tabela="links" titulo="Arquivos e links" iniciais={links}
          novo={{ tipo: "PASTA", titulo: "", url: "" }}
          campos={[{ k: "tipo", rotulo: "Etiqueta", dica: "PASTA, 360°, GUIA" }, { k: "titulo", rotulo: "Nome" }, { k: "url", rotulo: "Link", largo: true }]} />

        <EditorLista {...base} tabela="compras" titulo="Compras e fornecedores" iniciais={compras}
          novo={{ categoria: "", item: "", fornecedor: "", status: "pend" }}
          campos={[{ k: "categoria", rotulo: "Categoria", dica: "Marcenaria" }, { k: "item", rotulo: "Item" },
            { k: "fornecedor", rotulo: "Fornecedor" }, { k: "status", rotulo: "Situação", tipo: "status" }]} />

        <EditorLista {...base} tabela="ambientes" titulo="Imagens dos ambientes" iniciais={ambientes}
          novo={{ titulo: "", imagem_url: "" }}
          campos={[{ k: "titulo", rotulo: "Ambiente", dica: "Sala de estar" }, { k: "imagem_url", rotulo: "Imagem", tipo: "imagem" }]} />

        <EditorLista {...base} tabela="pessoas_projeto" titulo="Equipe do projeto" iniciais={pessoas}
          novo={{ nome: "", papel: "" }}
          campos={[{ k: "nome", rotulo: "Nome" }, { k: "papel", rotulo: "Papel no projeto" }]} />

        <div style={{ marginTop: 30 }}><ApagarProjeto projetoId={P.id} nome={P.titulo} /></div>
      </main>
    </>
  );
}
