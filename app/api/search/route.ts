import { NextResponse, type NextRequest } from "next/server";
import { searchMulti } from "@/lib/tmdb";

// GET /api/search?q=batman
// Proxy server-side a TMDB. La key de TMDB nunca llega al cliente.
// Usa /search/multi para devolver MEZCLA de películas y series.
// Cada resultado tiene `media_type: "movie" | "tv"`.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await searchMulti(q);

    // Filtramos personas (no las queremos en la búsqueda principal por ahora)
    // y mapeamos a una forma unificada.
    const results = data.results
      .filter(
        (item): item is Extract<typeof item, { media_type: "movie" | "tv" }> =>
          item.media_type === "movie" || item.media_type === "tv"
      )
      .slice(0, 8)
      .map((item) => {
        if (item.media_type === "movie") {
          return {
            id: item.id,
            media_type: "movie" as const,
            title: item.title,
            year: item.release_date
              ? parseInt(item.release_date.slice(0, 4), 10)
              : null,
            poster_path: item.poster_path ?? null,
          };
        }
        return {
          id: item.id,
          media_type: "tv" as const,
          title: item.name,
          year: item.first_air_date
            ? parseInt(item.first_air_date.slice(0, 4), 10)
            : null,
          poster_path: item.poster_path ?? null,
        };
      });
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[/api/search] error:", err);
    return NextResponse.json(
      { error: "search_failed", results: [] },
      { status: 500 }
    );
  }
}
