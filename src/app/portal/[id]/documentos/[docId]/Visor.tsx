"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { supabaseNavegador } from "@/lib/supabase/client";

type Props = {
  src: string; titulo: string; docId: string; projetoId: string; equipe: boolean; userId: string; meuNome: string;
  outros: { id: string; origem: string }[];
};
type Msg = { duo: number; id: number; op: string; a: Record<string, unknown> };
type Linha = { chave: string; dados: Record<string, unknown>; autor: string | null; autor_nome: string | null };

const idArtefato = (u: string) => /\/artifact\/([A-Za-z0-9_-]+)/.exec(u)?.[1] ?? "";

/**
 * Mostra o documento num quadro isolado e responde aos pedidos dele (ver src/lib/docs-runtime.ts):
 * marcações guardadas no Supabase, quem está vendo, localStorage do documento e links entre documentos.
 */
export function Visor({ src, titulo, docId, projetoId, equipe, userId, meuNome, outros }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const chaveLs = `duo-doc:${docId}`;

  // O localStorage do documento vai pelo "name" do quadro, para estar pronto antes dos scripts dele.
  // No servidor não há localStorage: o quadro só aparece no navegador.
  const nome = useSyncExternalStore(
    () => () => {},
    () => { try { return `duo:${localStorage.getItem(chaveLs) || "{}"}`; } catch { return "duo:{}"; } },
    () => null,
  );

  useEffect(() => {
    const sb = supabaseNavegador();
    const nomes: Record<string, string> = { [userId]: meuNome };
    const lembra = (l: Linha[]) => l.forEach((x) => { if (x.autor && x.autor_nome) nomes[x.autor] = x.autor_nome; });

    async function trata(m: Msg): Promise<unknown> {
      const a = m.a ?? {};
      const base = () => sb.from("documento_dados").select("chave,dados,autor,autor_nome").eq("documento_id", docId).eq("colecao", String(a.c));
      switch (m.op) {
        case "db.ok": case "user.id": return userId;
        case "user.nome": return meuNome;
        case "user.can": return a.s === "data.write" ? equipe : true;
        case "user.perfis": return Object.fromEntries((a.ids as string[]).map((i) => [i, { name: nomes[i] ?? "" }]));
        case "db.lista": {
          const { data, error } = await base();
          if (error) throw error;
          lembra(data as Linha[]);
          return data;
        }
        case "db.get": {
          const { data, error } = await base().eq("chave", String(a.k)).maybeSingle();
          if (error) throw error;
          if (data) lembra([data as Linha]);
          return data;
        }
        case "db.set": {
          let dados = (a.d ?? {}) as Record<string, unknown>;
          if (a.merge) {
            const { data } = await base().eq("chave", String(a.k)).maybeSingle();
            dados = { ...((data?.dados as Record<string, unknown>) ?? {}), ...dados };
          }
          const { error } = await sb.from("documento_dados").upsert({
            documento_id: docId, colecao: String(a.c), chave: String(a.k), dados,
            autor: userId, autor_nome: meuNome, atualizado_em: new Date().toISOString(),
          });
          if (error) throw error;
          return true;
        }
        case "db.del": {
          const { error } = await sb.from("documento_dados").delete()
            .eq("documento_id", docId).eq("colecao", String(a.c)).eq("chave", String(a.k));
          if (error) throw error;
          return true;
        }
        case "ls":
          try { localStorage.setItem(chaveLs, JSON.stringify(a.v ?? {})); } catch {}
          return true;
        case "artefato": {
          const alvo = outros.find((o) => o.origem && idArtefato(o.origem) === idArtefato(String(a.url)));
          if (alvo) router.push(`/portal/${projetoId}/documentos/${alvo.id}`);
          else window.open(String(a.url), "_blank", "noopener");
          return true;
        }
      }
      throw new Error("Pedido desconhecido");
    }

    function ouve(e: MessageEvent) {
      const win = ref.current?.contentWindow;
      if (!win || e.source !== win) return;
      const m = e.data as Msg;
      if (!m || m.duo !== 1) return;
      trata(m).then(
        (r) => { if (m.id) win.postMessage({ duo: 2, id: m.id, r }, "*"); },
        (er: { message?: string; code?: string }) => {
          // Sem permissão (regra de acesso do banco) vira "invalid_argument", como no Claude.
          const code = er?.code === "42501" || /row-level security/i.test(er?.message ?? "") ? "invalid_argument" : "erro";
          if (m.id) win.postMessage({ duo: 2, id: m.id, erro: er?.message ?? "Erro", code }, "*");
        },
      );
    }
    window.addEventListener("message", ouve);
    return () => window.removeEventListener("message", ouve);
  }, [docId, projetoId, equipe, userId, meuNome, outros, router, chaveLs]);

  if (nome === null) return <div className="doc-quadro carregando" />;
  return (
    <div className={`doc-quadro ${carregando ? "carregando" : ""}`}>
      <iframe ref={ref} src={src} name={nome} title={titulo} onLoad={() => setCarregando(false)}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-downloads"
        allow="clipboard-write; fullscreen" referrerPolicy="no-referrer" />
    </div>
  );
}
