import { NextResponse, type NextRequest } from "next/server";
import { getRecommendations } from "@/lib/tmdb";

// GET /api/recommendations/[tmdbId]
// Devuelve top 12 pelis similares según TMDB.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tmdbId: string }> }
) {
  const { tmdbId } = await params;
  const id = parseInt(tmdbId, 10);

  if (!Number.isFinite(id)) {
    return NextResponse.json(
      { error: "tmdbId inválido", results: [] },
      { status: 400 }
    );
  }

  try {
    const data = await getRecommendations(id);
    const results = data.results.slice(0, 12).map((m) => ({
      id: m.id,
      title: m.title,
      year: m.release_date
        ? parseInt(m.release_date.slice(0, 4), 10)
        : null,
      poster_path: m.poster_path ?? null,
    }));
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[/api/recommendations] error:", err);
    return NextResponse.json(
      { error: "recommendations_failed", results: [] },
      { status: 500 }
    );
  }
}
