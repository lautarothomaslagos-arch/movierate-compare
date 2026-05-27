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
// Devuelve { recommendations: [{ tmdb_id, title, year, why, media_type, poster_path }] }

type EnrichedRecommendation = Recommendation & {
  tmdb_id: number | null;
  poster_path: string | null;
};

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

    // Top 5 por rating desc (loved)
    const sortedByRating = [...reviews].sort((a, b) => b.rating - a.rating);
    const loved = sortedByRating
      .filter((r) => r.rating >= 7)
      .slice(0, 5)
      .map((r) => ({
        title: r.title,
        year: r.year,
        rating: r.rating,
      }));
    // Bottom 5 por rating asc (disliked)
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
      return NextResponse.json(
        {
          error: "no_results",
          message:
            "No pudimos generar recomendaciones esta vez. Probá de nuevo o cambiá la consulta.",
          recommendations: [],
        },
        { status: 200 }
      );
    }

    // Enriquecer con tmdb_id y poster_path via /search/multi
    const enriched: EnrichedRecommendation[] = await Promise.all(
      recs.map(async (rec) => {
        try {
          // Si tenemos año, lo agregamos al query para mejor matching
          const q = rec.year ? `${rec.title} ${rec.year}` : rec.title;
          const sr = await searchMulti(q);
          // Buscamos el primer resultado del media_type esperado
          const match = sr.results.find(
            (r) => r.media_type === rec.media_type
          );
          if (match) {
            if (match.media_type === "movie") {
              return {
                ...rec,
                tmdb_id: match.id,
                poster_path: match.poster_path ?? null,
              };
            }
            if (match.media_type === "tv") {
              return {
                ...rec,
                tmdb_id: match.id,
                poster_path: match.poster_path ?? null,
              };
            }
          }
          // Fallback: cualquier match (puede que el media_type haya cambiado)
          const anyMatch = sr.results.find(
            (r) => r.media_type === "movie" || r.media_type === "tv"
          );
          if (anyMatch && (anyMatch.media_type === "movie" || anyMatch.media_type === "tv")) {
            return {
              ...rec,
              media_type: anyMatch.media_type,
              tmdb_id: anyMatch.id,
              poster_path: anyMatch.poster_path ?? null,
            };
          }
          return { ...rec, tmdb_id: null, poster_path: null };
        } catch (err) {
          console.warn("[recommend] enrich failed for", rec.title, err);
          return { ...rec, tmdb_id: null, poster_path: null };
        }
      })
    );

    // Filtrar las que no tienen tmdb_id (no se encontraron en TMDB)
    const valid = enriched.filter((r) => r.tmdb_id !== null);

    return NextResponse.json({ recommendations: valid });
  } catch (err) {
    console.error("[recommend] failed:", err);
    return NextResponse.json(
      { error: "internal", message: "Error generando recomendaciones." },
      { status: 500 }
    );
  }
}
