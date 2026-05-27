import { NextResponse, type NextRequest } from "next/server";

import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getRecommendations } from "@/lib/tmdb";

// GET /api/recommendations/[tmdbId]
// Devuelve top 12 pelis similares según TMDB.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tmdbId: string }> }
) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`recs:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limit", results: [] },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      }
    );
  }

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
