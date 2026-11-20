import type { Metadata } from "next";
import { BarraPortal } from "@/components/BarraPortal";

export const metadata: Metadata = { title: "Área do cliente" };

export default function Portal() {
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
          <p>
            Digite o e-mail cadastrado no seu contrato. Vamos enviar um link de acesso, sem precisar de senha.
          </p>
          <form>
            <div className="campo">
              <label className="rot" htmlFor="email">E-mail</label>
              <input id="email" type="email" autoComplete="email" disabled placeholder="voce@email.com" />
            </div>
            <button className="btn" type="submit" disabled>Receber link →</button>
          </form>
          <p className="rot" style={{ color: "var(--terra)" }}>
            O novo portal está em preparação. Enquanto isso, use o link que a equipe enviou no WhatsApp.
          </p>
        </div>
      </main>
    </>
  );
}
