import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente para Server Components / Route Handlers / Server Actions.
// Usa la PUBLISHABLE key (no la secret) porque corre en un contexto
// donde hay sesión de usuario y respeta RLS.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Los Server Components no pueden mutar cookies. El refresh
            // real lo hace proxy.ts en cada request, así que este catch
            // es esperado y se ignora con seguridad.
          }
        },
      },
    }
  );
}

// Cliente con permisos de service role para operaciones de servidor
// que NO deben respetar RLS (ej: escribir en ratings_cache).
// SOLO usar desde Route Handlers o Server Actions — NUNCA en componentes
// que se rendericen en el cliente.
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // no-op: el service client no tiene sesión
        },
      },
    }
  );
}
