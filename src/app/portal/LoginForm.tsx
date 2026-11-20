"use client";
import { useActionState } from "react";
import { enviarLink, type EstadoLogin } from "./acoes";

export function LoginForm({ erroLink }: { erroLink?: boolean }) {
  const [st, acao, enviando] = useActionState<EstadoLogin, FormData>(enviarLink, {});
  if (st.ok)
    return (
      <div className="cartao" style={{ maxWidth: 480 }}>
        <span className="rot" style={{ color: "var(--verde)" }}>Link enviado</span>
        <h3 style={{ fontSize: 30, margin: "6px 0 10px" }}>Confira seu e-mail.</h3>
        <p>
          Mandamos um link de acesso para <b>{st.email}</b>. Abra o e-mail neste aparelho e toque no link. Se não
          aparecer em alguns minutos, olhe a caixa de spam.
        </p>
      </div>
    );
  return (
    <>
      <form action={acao}>
        <div className="campo">
          <label className="rot" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required defaultValue={st.email} placeholder="voce@email.com" />
        </div>
        <button className="btn" type="submit" disabled={enviando}>{enviando ? "Enviando..." : "Receber link →"}</button>
      </form>
      <p className="erro" role="alert">
        {st.erro ?? (erroLink ? "Esse link expirou ou já foi usado. Peça um novo abaixo." : "")}
      </p>
    </>
  );
}
