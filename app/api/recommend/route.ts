import { NextResponse, type NextRequest } from "next/server";

import { recommend, type Recommendation } from "@/lib/ai-recommender";
import { getHistoryFromDb } from "@/lib/history";
import { rateLimit } from "@/lib/rate-limit";
import { getMyReviews } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/server";
import { searchMulti } from "@/lib/tmdb";
import { getWatchlistFromDb } from "@/lib/watchlist";

// POST /api/recommend
// Body: { query?: string, mood?: string, locale?: "es" | "en" }
// Requiere auth. Rate limit: 10 req/24h por user_id.
// Devuelve { recommendations: [{ tmdb_id, title, year, lede, body, media_type, poster_path }] }
//
// v2: el enriquecimiento con TMDB es mucho más tolerante. Antes si una rec
// fallaba al matchear, se descartaba entera y el user veía 1 o 2 cosas o
// nada. Ahora probamos varias estrategias por rec y solo en último caso
// la devolvemos sin tmdb_id (la UI la muestra como link al search).

type EnrichedRecommendation = Recommendation & {
  tmdb_id: number | null;
  poster_path: string | null;
};

// Intenta resolver una rec a un item de TMDB con múltiples estrategias
// en cascada. Cada falla baja al siguiente intento.
async function enrichRecommendation(
  rec: Recommendation
): Promise<EnrichedRecommendation> {
  type SearchResult = Awaited<ReturnType<typeof searchMulti>>["results"][number];

  function pickFromResults(
    results: SearchResult[],
    preferredType: "movie" | "tv" | null
  ): { id: number; media_type: "movie" | "tv"; poster_path: string | null } | null {
    // 1) Match por media_type preferido
    if (preferredType) {
      const m = results.find((r) => r.media_type === preferredType);
      if (m && (m.media_type === "movie" || m.media_type === "tv")) {
        return {
          id: m.id,
          media_type: m.media_type,
          poster_path: m.poster_path ?? null,
        };
      }
    }
    // 2) Cualquier match de movie/tv (acepta el otro media_type si la IA se confundió)
    const any = results.find(
      (r) => r.media_type === "movie" || r.media_type === "tv"
    );
    if (any && (any.media_type === "movie" || any.media_type === "tv")) {
      return {
        id: any.id,
        media_type: any.media_type,
        poster_path: any.poster_path ?? null,
      };
    }
    return null;
  }

  const queries: string[] = [];
  // Estrategia A: title + year (más preciso)
  if (rec.year) queries.push(`${rec.title} ${rec.year}`);
  // Estrategia B: solo title (por si el año está mal)
  queries.push(rec.title);
  // Estrategia C: title sin caracteres especiales (por si tiene ":" o "—")
  const cleanTitle = rec.title.replace(/[:\-—–·]/g, " ").replace(/\s+/g, " ").trim();
  if (cleanTitle !== rec.title) queries.push(cleanTitle);

  for (const q of queries) {
    try {
      const sr = await searchMulti(q);
      const pick = pickFromResults(sr.results, rec.media_type);
      if (pick) {
        return {
          ...rec,
          media_type: pick.media_type,
          tmdb_id: pick.id,
          poster_path: pick.poster_path,
        };
      }
    } catch (err) {
      console.warn("[recommend:enrich] search threw for", q, err);
      // Seguimos a la próxima estrategia
    }
  }

  // No matcheó nada → devolvemos sin tmdb_id (la UI puede mostrar
  // como link al search en lugar de descartar).
  return { ...rec, tmdb_id: null, poster_path: null };
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  // Rate limit por user_id: 10 cada 24h. Como el cómputo es caro (IA + 5
  // búsquedas TMDB), preferimos ser estrictos.
  const rl = rateLimit(`recommend:${user.id}`, {
    limit: 10,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "rate_limit",
        message: "Llegaste al máximo de 10 recomendaciones por día.",
        retryAfterSeconds: rl.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      }
    );
  }

  // Body
  let body: { query?: string; mood?: string; locale?: string } = {};
  try {
    body = await request.json();
  } catch {
    // body opcional — recomendamos basándonos solo en el perfil
  }
  const query = typeof body.query === "string" ? body.query.trim() : null;
  const mood = typeof body.mood === "string" ? body.mood.trim() : null;
  const locale: "es" | "en" = body.locale === "en" ? "en" : "es";

  // Construir contexto del user
  try {
    const [history, watchlist, reviews] = await Promise.all([
      getHistoryFromDb(50),
      getWatchlistFromDb(50),
      getMyReviews(100),
    ]);

    const sortedByRating = [...reviews].sort((a, b) => b.rating - a.rating);
    const loved = sortedByRating
      .filter((r) => r.rating >= 7)
      .slice(0, 5)
      .map((r) => ({
        title: r.title,
        year: r.year,
        rating: r.rating,
      }));
    const disliked = [...reviews]
      .sort((a, b) => a.rating - b.rating)
      .filter((r) => r.rating < 5)
      .slice(0, 5)
      .map((r) => ({
        title: r.title,
        year: r.year,
        rating: r.rating,
      }));

    const recommenderInput = {
      recentlyWatched: history.slice(0, 15).map((h) => ({
        title: h.title,
        year: h.year,
      })),
      watchlist: watchlist.slice(0, 15).map((w) => ({
        title: w.title,
        year: w.year,
      })),
      loved,
      disliked,
      query,
      mood,
    };

    const recs = await recommend(recommenderInput, locale);

    if (recs.length === 0) {
      console.warn(
        "[recommend] empty recs for user",
        user.id.slice(0, 8),
        "query:",
        query,
        "mood:",
        mood
      );
      return NextResponse.json(
        {
          error: "no_results",
          message:
            "No pudimos generar recomendaciones esta vez. Probá con otra consulta o cambiá el mood.",
          recommendations: [],
        },
        { status: 200 }
      );
    }

    // Enriquecer con tmdb_id y poster_path (tolerante a fallos).
    const enriched = await Promise.all(recs.map((rec) => enrichRecommendation(rec)));

    // Stats para debug
    const withTmdb = enriched.filter((r) => r.tmdb_id !== null).length;
    console.log(
      `[recommend] enriched ${withTmdb}/${enriched.length} with TMDB ids`
    );

    // Si ninguna matcheó TMDB, devolvemos no_results para que la UI sea clara
    if (withTmdb === 0) {
      return NextResponse.json(
        {
          error: "no_results",
          message:
            "Las recomendaciones no se pudieron verificar. Probá con otra consulta.",
          recommendations: [],
        },
        { status: 200 }
      );
    }

    // Devolvemos TODAS las recs (incluso las sin tmdb_id) — la UI decide
    // cómo renderizarlas (las sin id van como link al search general).
    return NextResponse.json({ recommendations: enriched });
  } catch (err) {
    console.error("[recommend] failed:", err);
    return NextResponse.json(
      {
        error: "internal",
        message:
          err instanceof Error
            ? `Error generando recomendaciones: ${err.message}`
            : "Error generando recomendaciones.",
      },
      { status: 500 }
    );
  }
}
