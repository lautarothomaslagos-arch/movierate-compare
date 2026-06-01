import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16 renombró `middleware` → `proxy`. Runtime es nodejs (no edge).
//
// Componemos dos middlewares en cadena:
// 1. updateSession (Supabase): refresca tokens en cookies en cada request
// 2. createIntlMiddleware (next-intl): maneja redirect/rewrite por locale
//
// Las rutas /api/* y /auth/callback NO pasan por el i18n middleware porque
// no son páginas. Sí pasan por Supabase (necesitan cookies de sesión).

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  // 1) Refresh de sesión de Supabase para TODA request que pase por el matcher
  const supabaseResponse = await updateSession(request);

  // 2) Si la ruta es /api/* o /auth/* la dejamos pasar sin i18n
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api") || pathname.startsWith("/auth")) {
    return supabaseResponse;
  }

  // 3) Aplicamos i18n middleware. Si redirige (ej `/movie/1` → `/es/movie/1`),
  // ese response gana. Si no redirige, mergeamos las cookies de Supabase.
  const intlResponse = intlMiddleware(request);

  // Si intl decidió redirigir, devolvemos eso pero copiando cookies de Supabase
  if (intlResponse.headers.get("location")) {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      intlResponse.cookies.set(cookie.name, cookie.value);
    });
    return intlResponse;
  }

  // Sino, mergeamos: tomamos el response de Supabase (que tiene las cookies)
  // y le agregamos los headers que intl haya seteado (ej `x-middleware-rewrite`)
  const finalResponse =
    intlResponse instanceof NextResponse ? intlResponse : supabaseResponse;
  // Copiar cookies de supabase al response final
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie.name, cookie.value);
  });
  return finalResponse;
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas EXCEPTO:
     * - _next, _vercel: assets internos de Next/Vercel
     * - icon, icon1, icon2…: PNGs generados por app/icon*.tsx (PWA icons +
     *   favicon). Estos NO tienen extensión en la URL, así que la regla
     *   de "path con punto" no los excluye — había que listarlos a mano.
     *   Sin esto, /icon se redirigía a /es/icon → 404 → Chrome no podía
     *   leer los íconos del manifest → PWA no instalable.
     * - apple-icon: 180×180 para iOS, mismo problema.
     * - cualquier path con punto (.*\\..*): excluye sitemap.xml, robots.txt,
     *   manifest.json, sw.js, favicon.ico, imágenes, fonts, etc.
     * - api y auth NO se excluyen acá (siguen pasando por Supabase para
     *   refresh de sesión), pero el código interno hace early return antes
     *   del i18n middleware.
     */
    "/((?!_next|_vercel|icon|apple-icon|.*\\..*).*)",
  ],
};
