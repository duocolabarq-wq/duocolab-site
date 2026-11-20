import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServidor } from "@/lib/supabase/server";

// O link mágico do e-mail chega aqui. Validamos e mandamos para o portal.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const sb = await supabaseServidor();
  let ok = false;

  const code = q.get("code");
  const tokenHash = q.get("token_hash");
  const type = q.get("type") as EmailOtpType | null;
  if (code) ok = !(await sb.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await sb.auth.verifyOtp({ token_hash: tokenHash, type })).error;

  const destino = req.nextUrl.clone();
  destino.search = "";
  destino.pathname = "/portal";
  if (!ok) destino.searchParams.set("erro", "link");
  return NextResponse.redirect(destino);
}
