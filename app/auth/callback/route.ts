import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Endpoint que recibe el `code` de Google OAuth y lo intercambia por
// una sesión de Supabase. Después redirige a `next` (o al home).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Si algo falla, volvemos al home con un flag de error para mostrar
  // un toast desde el cliente.
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
