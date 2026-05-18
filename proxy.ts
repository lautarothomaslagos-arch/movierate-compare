import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16 renombró `middleware` → `proxy`. Runtime es nodejs (no edge),
// que es lo que Supabase Auth necesita igual.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas EXCEPTO:
     * - _next/static  → assets estáticos
     * - _next/image   → imágenes optimizadas
     * - favicon.ico
     * - archivos públicos con extensión común
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
