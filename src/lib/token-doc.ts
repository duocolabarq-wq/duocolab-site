import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Os documentos abrem num quadro isolado (iframe sandbox), que não envia os cookies de login.
// Por isso o endereço do documento leva uma chave assinada pelo servidor, válida por algumas horas,
// gerada só depois de conferir que a pessoa logada pode ver aquele documento.
const VALIDADE_S = 8 * 60 * 60;

function segredo() {
  const s = process.env.DOCS_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!s) throw new Error("Falta a chave do servidor (SUPABASE_SERVICE_ROLE_KEY ou DOCS_TOKEN_SECRET).");
  return s;
}

const assinar = (docId: string, exp: number) =>
  createHmac("sha256", segredo()).update(`${docId}.${exp}`).digest("base64url").slice(0, 32);

export function chaveDoc(docId: string) {
  const exp = Math.floor(Date.now() / 1000) + VALIDADE_S;
  return `${exp.toString(36)}.${assinar(docId, exp)}`;
}

export function chaveValida(chave: string, docId: string) {
  const [e, sig] = chave.split(".");
  const exp = parseInt(e ?? "", 36);
  if (!sig || !Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const certo = Buffer.from(assinar(docId, exp));
  const veio = Buffer.from(sig);
  return certo.length === veio.length && timingSafeEqual(certo, veio);
}
