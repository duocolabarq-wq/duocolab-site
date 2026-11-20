import Link from "next/link";

export function BarraPortal({ titulo = "Área do cliente", children }: { titulo?: string; children?: React.ReactNode }) {
  return (
    <header className="ac-barra">
      <div className="esq">
        <Link href="/"><img src="/img/logo_verde.png" alt="Duo Colab Arquitetura" /></Link>
        <span className="rot">{titulo}</span>
      </div>
      <div className="dir">
        {children}
        <Link className="rot" href="/">Voltar ao site</Link>
      </div>
    </header>
  );
}
