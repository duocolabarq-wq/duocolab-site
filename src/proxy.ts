import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/env";

// Renova a sessão do Supabase e protege o painel da equipe.
export default async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  if (!supabaseConfigurado) return res;

  const sb = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        lista.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser();

  const p = req.nextUrl.pathname;
  const protegido = p.startsWith("/admin") || (p.startsWith("/portal/") && p !== "/portal/");
  if (protegido && !data.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/portal";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = { matcher: ["/portal/:path*", "/admin/:path*", "/auth/:path*"] };
