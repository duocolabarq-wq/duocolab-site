"use client";
import { useState, useTransition } from "react";
import { salvarEquipe, type Resultado } from "../acoes";

type P = { email: string; nome: string };
export function EditorEquipe({ iniciais }: { iniciais: P[] }) {
  const [lista, setLista] = useState<P[]>(iniciais);
  const [r, setR] = useState<Resultado | null>(null);
  const [pend, start] = useTransition();
  const muda = (i: number, k: keyof P, v: string) => { setR(null); setLista((l) => l.map((p, j) => (j === i ? { ...p, [k]: v } : p))); };
  return (
    <div className="adm-corpo">
      {lista.map((p, i) => (
        <div key={i} className="adm-item">
          <div className="campo"><label className="rot">Nome</label><input value={p.nome} onChange={(e) => muda(i, "nome", e.target.value)} /></div>
          <div className="campo"><label className="rot">E-mail</label><input type="email" value={p.email} onChange={(e) => muda(i, "email", e.target.value)} /></div>
          <div className="adm-ctrl"><button type="button" className="apaga" onClick={() => setLista((l) => l.filter((_, j) => j !== i))}>Remover</button></div>
        </div>
      ))}
      <button type="button" className="adm-add" onClick={() => setLista((l) => [...l, { email: "", nome: "" }])}>+ Adicionar pessoa</button>
      <div className="adm-salvar">
        <button type="button" className="btn verde" disabled={pend} onClick={() => start(async () => setR(await salvarEquipe(lista)))}>Salvar equipe</button>
        {pend ? <span className="rot">Salvando...</span> : r?.erro ? <span className="erro">{r.erro}</span> : r?.ok ? <span className="ok-msg">✓ Equipe salva.</span> : null}
      </div>
    </div>
  );
}
