import { NextResponse } from "next/server";

import { getHistoryFromDb } from "@/lib/history";
import { getTrending, getYear } from "@/lib/tmdb";

type SearchItem = {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
};

// GET /api/search/suggestions
// Devuelve sugerencias para el dropdown del SearchBar cuando NO hay query.
// {
//   recent: SearchItem[]  // hasta 5 — del historial DB del user (si logueado)
//   trending: SearchItem[] // hasta 6 — top del día
// }
//
// Si user no logueado, recent va vacío (el cliente lo completa con localStorage).
//
// Cache: usamos el fetch cache de Next.js (revalidate 5min) para trending.
// Recent se chequea por request (depende del user).
export async function GET() {
  let recent: SearchItem[] = [];
  let trending: SearchItem[] = [];

  // Recent: historial DB del user (5)
  try {
    const items = await getHistoryFromDb(5);
    recent = items.map((it) => ({
      id: it.tmdb_id,
      media_type: it.media_type,
      title: it.title,
      year: it.year,
      poster_path: it.poster_path,
    }));
  } catch (err) {
    console.warn("[suggestions/recent] failed:", err);
  }

  // Trending: top 6 del día
  try {
    const t = await getTrending("day");
    trending = t.results
      .filter(
        (r): r is Extract<typeof r, { media_type: "movie" | "tv" }> =>
          r.media_type === "movie" || r.media_type === "tv"
      )
      .slice(0, 6)
      .map((r) => {
        if (r.media_type === "movie") {
          return {
            id: r.id,
            media_type: "movie" as const,
            title: r.title,
            year: getYear(r.release_date),
            poster_path: r.poster_path ?? null,
          };
        }
        return {
          id: r.id,
          media_type: "tv" as const,
          title: r.name,
          year: getYear(r.first_air_date),
          poster_path: r.poster_path ?? null,
        };
      });
  } catch (err) {
    console.warn("[suggestions/trending] failed:", err);
  }

  return NextResponse.json({ recent, trending });
}
