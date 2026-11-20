import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraPortal } from "@/components/BarraPortal";
import { sessao } from "@/lib/supabase/server";
import { sair } from "../portal/acoes";
import { criarProjeto } from "./acoes";
import "../portal/portal.css";
import "./admin.css";

export const metadata: Metadata = { title: "Painel da equipe" };

export default async function Admin({ searchParams }: PageProps<"/admin">) {
  const { erro } = await searchParams;
  const s = await sessao();
  if (!s.user || !s.equipe) redirect("/portal");

  const [{ data: projetos }, { data: novas }] = await Promise.all([
    s.sb.from("projetos").select("id,codigo,titulo,cliente,status,arquivado,atualizado_em").order("atualizado_em", { ascending: false }),
    s.sb.from("decisoes").select("projeto_id").eq("lida_pela_equipe", false),
  ]);
  const respostas = new Map<string, number>();
  (novas ?? []).forEach((d) => respostas.set(d.projeto_id, (respostas.get(d.projeto_id) ?? 0) + 1));

  return (
    <>
      <BarraPortal titulo="Painel da equipe">
        <form action={sair}><button className="rot" type="submit">Sair</button></form>
      </BarraPortal>
      <main className="ac-wrap">
        <div className="ola"><div><h2>Projetos</h2><p>Cadastre clientes e atualize o que eles veem no portal.</p></div></div>

        <section className="cartao">
          <div className="cab-c"><h3>Novo projeto</h3></div>
          <form action={criarProjeto} className="adm-linha">
            <div className="campo"><label className="rot">Código</label><input name="codigo" required placeholder="0926" /></div>
            <div className="campo" style={{ flex: 2 }}><label className="rot">Nome do projeto</label><input name="titulo" required placeholder="Casa M" /></div>
            <div className="campo" style={{ flex: 2 }}><label className="rot">Cliente (como cumprimentar)</label><input name="cliente" required placeholder="Gustavo e Rafaely" /></div>
            <button className="btn verde" type="submit">Criar →</button>
          </form>
          {erro && <p className="erro">{erro}</p>}
        </section>

        <section className="cartao">
          {(projetos ?? []).length === 0 && <p className="vazio">Nenhum projeto cadastrado ainda.</p>}
          {(projetos ?? []).map((p) => (
            <div key={p.id} className="linha-l" style={{ alignItems: "center" }}>
              <div>
                <Link href={`/admin/${p.id}`} style={{ fontFamily: "var(--serif)", fontSize: 22 }}>[{p.codigo}] {p.titulo}</Link>
                <small>{p.cliente} · {p.status}{p.arquivado ? " · arquivado" : ""} · atualizado em {new Date(p.atualizado_em).toLocaleDateString("pt-BR")}</small>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {respostas.get(p.id) && <span className="tag pend">{respostas.get(p.id)} resposta(s) nova(s)</span>}
                <Link className="rot" href={`/portal/${p.id}`}>Ver como cliente</Link>
              </div>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
