import { NextResponse, type NextRequest } from "next/server";
import { searchMovies } from "@/lib/tmdb";

// GET /api/search?q=batman
// Proxy server-side a TMDB. La key de TMDB nunca llega al cliente.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await searchMovies(q);
    // Recortamos a top 8 y solo los campos que necesita el autocomplete
    const results = data.results.slice(0, 8).map((m) => ({
      id: m.id,
      title: m.title,
      year: m.release_date ? parseInt(m.release_date.slice(0, 4), 10) : null,
      poster_path: m.poster_path ?? null,
    }));
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[/api/search] error:", err);
    return NextResponse.json(
      { error: "search_failed", results: [] },
      { status: 500 }
    );
  }
}
