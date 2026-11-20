import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraPortal } from "@/components/BarraPortal";
import { supabaseConfigurado } from "@/lib/supabase/env";
import { sessao } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";
import { sair } from "./acoes";
import "./portal.css";

export const metadata: Metadata = { title: "Área do cliente" };

export default async function Portal({ searchParams }: PageProps<"/portal">) {
  const { erro } = await searchParams;
  const s = supabaseConfigurado ? await sessao() : null;

  if (s?.user) {
    const { data: projetos } = await s.sb
      .from("projetos").select("id,titulo,codigo,status,servico,capa_url,cliente")
      .eq("arquivado", false).order("atualizado_em", { ascending: false });
    const lista = projetos ?? [];
    if (lista.length === 1 && !s.equipe) redirect(`/portal/${lista[0].id}`);
    return (
      <>
        <BarraPortal>
          {s.equipe && <Link className="rot" href="/admin">Painel da equipe</Link>}
          <form action={sair}><button className="rot" type="submit">Sair</button></form>
        </BarraPortal>
        <main className="ac-wrap">
          <div className="ola"><div><h2>Seus projetos</h2><p>{s.user.email}</p></div></div>
          {lista.length === 0 && (
            <div className="cartao"><p>Ainda não há projetos liberados para este e-mail. Fale com a equipe da Duo.</p></div>
          )}
          {lista.map((p) => (
            <Link key={p.id} href={`/portal/${p.id}`} className="cartao capa-proj" style={{ display: "block" }}>
              {p.capa_url && <div className="ph" style={{ backgroundImage: `url(${p.capa_url})` }} />}
              <div className="in">
                <div><h3>[{p.codigo}] {p.titulo}</h3><div className="sub">{p.cliente} · {p.servico}</div></div>
                <span className="chip"><i className="d" />{p.status}</span>
              </div>
            </Link>
          ))}
        </main>
      </>
    );
  }

  return (
    <>
      <BarraPortal />
      <main className="login">
        <div className="lado-img">
          <img src="/img/bento-joao-render-5.jpg" alt="" />
          <p>Seu projeto, as decisões e os arquivos num lugar só.</p>
        </div>
        <div className="lado-form">
          <span className="rot" style={{ color: "var(--suave)" }}>Acesso do cliente</span>
          <h1>Bem-vindo de volta.</h1>
          <p>Digite o e-mail cadastrado no seu contrato. Vamos enviar um link de acesso, sem precisar de senha.</p>
          {supabaseConfigurado ? (
            <LoginForm erroLink={erro === "link"} />
          ) : (
            <p className="rot" style={{ color: "var(--terra)" }}>
              O novo portal está em preparação. Enquanto isso, use o link que a equipe enviou no WhatsApp.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
