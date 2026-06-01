import { NextResponse, type NextRequest } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

// GET /api/admin/refresh-all-ratings?token=XXX
// =============================================================================
// Endpoint admin: vacía las tablas de cache de ratings (movies + tv) para
// forzar refetch en la próxima request. Útil cuando se mejoró la lógica de
// fetch (ej. fallback IMDb scrape añadido) y queremos que los entries ya
// cacheados se regeneren con la lógica nueva sin esperar el TTL de 7 días.
//
// Seguridad: requiere ?token=XXX que matchee ADMIN_REFRESH_TOKEN (env var).
// Sin token o token equivocado → 401.
//
// Usa service client (bypasea RLS — necesario para DELETE en ratings_cache
// y tv_ratings_cache, que son write-only para service_role).
// =============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const expected = process.env.ADMIN_REFRESH_TOKEN;

  if (!expected) {
    return NextResponse.json(
      { error: "admin_token_not_configured" },
      { status: 500 }
    );
  }

  if (!token || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    // PostgREST requiere un filtro para DELETE. neq con un id imposible
    // matchea todas las filas.
    const [movieResult, tvResult] = await Promise.all([
      supabase
        .from("ratings_cache")
        .delete({ count: "exact" })
        .neq("tmdb_id", -1),
      supabase
        .from("tv_ratings_cache")
        .delete({ count: "exact" })
        .neq("tmdb_id", -1),
    ]);

    if (movieResult.error) {
      return NextResponse.json(
        { error: "movies_delete_failed", details: movieResult.error.message },
        { status: 500 }
      );
    }
    if (tvResult.error) {
      return NextResponse.json(
        { error: "tv_delete_failed", details: tvResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      deleted: {
        movies: movieResult.count ?? 0,
        tv: tvResult.count ?? 0,
      },
      message:
        "Cache vaciada. Las próximas requests van a refetchear desde TMDB/OMDb/IMDb-scrape.",
    });
  } catch (err) {
    console.error("[/api/admin/refresh-all-ratings] error:", err);
    return NextResponse.json(
      {
        error: "internal_error",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
