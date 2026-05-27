import { NextResponse, type NextRequest } from "next/server";

import { getRatings } from "@/lib/ratings";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// GET /api/ratings/[tmdbId]
// Devuelve los ratings normalizados de todas las plataformas.
// En Next 16, params es Promise — hay que await.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tmdbId: string }> }
) {
  // Rate limit: 30 req/min por IP en endpoints que pegan a OMDb (caro)
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`ratings:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limit" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      }
    );
  }

  const { tmdbId } = await params;
  const id = parseInt(tmdbId, 10);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "tmdbId inválido" }, { status: 400 });
  }

  try {
    const ratings = await getRatings(id);
    return NextResponse.json(ratings);
  } catch (err) {
    console.error("[/api/ratings] error:", err);
    return NextResponse.json({ error: "ratings_failed" }, { status: 500 });
  }
}
