import { NextResponse, type NextRequest } from "next/server";
import { getRatings } from "@/lib/ratings";

// GET /api/ratings/[tmdbId]
// Devuelve los ratings normalizados de todas las plataformas.
// En Next 16, params es Promise — hay que await.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tmdbId: string }> }
) {
  const { tmdbId } = await params;
  const id = parseInt(tmdbId, 10);

  if (!Number.isFinite(id)) {
    return NextResponse.json(
      { error: "tmdbId inválido" },
      { status: 400 }
    );
  }

  try {
    const ratings = await getRatings(id);
    return NextResponse.json(ratings);
  } catch (err) {
    console.error("[/api/ratings] error:", err);
    return NextResponse.json(
      { error: "ratings_failed" },
      { status: 500 }
    );
  }
}
