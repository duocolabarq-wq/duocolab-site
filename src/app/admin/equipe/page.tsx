import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarraPortal } from "@/components/BarraPortal";
import { sessao } from "@/lib/supabase/server";
import { EditorEquipe } from "./EditorEquipe";
import "../../portal/portal.css";
import "../admin.css";

export const metadata: Metadata = { title: "Equipe" };

export default async function Equipe() {
  const s = await sessao();
  if (!s.user || !s.equipe) redirect("/portal");
  const { data } = await s.sb.from("equipe").select("email,nome").order("nome");
  return (
    <>
      <BarraPortal titulo="Painel da equipe"><Link className="rot" href="/admin">Projetos</Link></BarraPortal>
      <main className="ac-wrap">
        <div className="ola"><div><h2>Equipe</h2><p>Quem está aqui entra no painel e vê todos os projetos.</p></div></div>
        <section className="cartao"><EditorEquipe iniciais={data ?? []} /></section>
      </main>
    </>
  );
}
