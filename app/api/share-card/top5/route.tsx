import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getMyReviews } from "@/lib/reviews";

// GET /api/share-card/top5
// Genera una imagen 1080×1920 (stories vertical) con el TOP 5 reviews
// del usuario autenticado. Pensado para postear en IG stories.
//
// Layout:
//   - Wordmark "MovieRate Compare." arriba
//   - Título grande "Mi Top 5"
//   - Lista de 5 entradas: rank en brass + título + año + nota + estrella
//   - Footer con la firma del user
//
// Requiere auth. Si no hay reviews suficientes (>=3), devuelve 400 con
// mensaje para que el front muestre algo útil al user.

export const runtime = "nodejs";

const SIZE = { width: 1080, height: 1920 };
const BRASS = "#e0b870";
const CREAM = "#f3e7c8";
const NIGHT = "#0a0804";
const DIM = "#a89878";

const STAR_PATH =
  "M50 10 L40.60 37.06 L11.96 37.64 L34.78 54.94 L26.49 82.36 L50 66 L73.51 82.36 L65.22 54.94 L88.04 37.64 L59.41 37.06 Z";

function BrandStarSvg({ size, fillY }: { size: number; fillY: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <clipPath id="t5-star-clip">
          <path d={STAR_PATH} />
        </clipPath>
      </defs>
      <path d={STAR_PATH} fill={CREAM} fillOpacity={0.16} />
      <g clipPath="url(#t5-star-clip)">
        <rect x={0} y={fillY} width={100} height={100} fill={BRASS} />
      </g>
      <path
        d={STAR_PATH}
        fill="none"
        stroke={CREAM}
        strokeWidth={2.4}
        strokeLinejoin="round"
        strokeOpacity={0.85}
      />
    </svg>
  );
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("unauthorized", { status: 401 });
  }

  const reviews = await getMyReviews(100);
  const top = [...reviews]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  if (top.length < 3) {
    return new Response("not enough reviews", { status: 400 });
  }

  const userName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: NIGHT,
          padding: "70px 64px",
          position: "relative",
        }}
      >
        {/* Gradiente sutil decorativo top-right */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(80% 50% at 80% 0%, rgba(224,184,112,0.12) 0%, rgba(10,8,4,0) 70%)",
            display: "flex",
          }}
        />

        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            position: "relative",
          }}
        >
          <BrandStarSvg size={42} fillY={28.81} />
          <div
            style={{
              fontSize: 24,
              color: DIM,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              display: "flex",
              gap: 6,
            }}
          >
            <span>MovieRate</span>
            <span style={{ color: BRASS }}>·</span>
            <span>Compare</span>
          </div>
        </div>

        {/* Título */}
        <div
          style={{
            position: "relative",
            marginTop: 60,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <p
            style={{
              fontSize: 22,
              color: DIM,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Mi Top 5
          </p>
          <p
            style={{
              fontSize: 90,
              fontStyle: "italic",
              fontWeight: 400,
              lineHeight: 0.95,
              color: CREAM,
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            Lo mejor que vi.
          </p>
        </div>

        {/* Lista */}
        <div
          style={{
            position: "relative",
            marginTop: 70,
            display: "flex",
            flexDirection: "column",
            gap: 30,
            flex: 1,
          }}
        >
          {top.map((r, idx) => {
            const fillY = 10 + (1 - r.rating / 10) * 72.36;
            return (
              <div
                key={`${r.media_type}-${r.tmdb_id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 26,
                  borderBottom: "1px solid rgba(224,184,112,0.18)",
                  paddingBottom: 24,
                }}
              >
                {/* Rank brass grande */}
                <div
                  style={{
                    fontSize: 96,
                    fontStyle: "italic",
                    fontWeight: 700,
                    color: BRASS,
                    lineHeight: 1,
                    width: 90,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  {idx + 1}
                </div>
                {/* Título + año */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    color: CREAM,
                  }}
                >
                  <div
                    style={{
                      fontSize: 38,
                      fontWeight: 700,
                      lineHeight: 1.1,
                      letterSpacing: "-0.01em",
                      maxWidth: 660,
                      display: "flex",
                    }}
                  >
                    {r.title}
                  </div>
                  {r.year !== null && (
                    <div
                      style={{
                        fontSize: 20,
                        color: DIM,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        display: "flex",
                        gap: 10,
                      }}
                    >
                      <span>{r.year}</span>
                      <span style={{ color: BRASS, opacity: 0.6 }}>·</span>
                      <span>{r.media_type === "tv" ? "Serie" : "Peli"}</span>
                    </div>
                  )}
                </div>
                {/* Estrella + nota */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <BrandStarSvg size={62} fillY={fillY} />
                  <div
                    style={{
                      fontSize: 64,
                      fontStyle: "italic",
                      fontWeight: 700,
                      color: BRASS,
                      lineHeight: 0.95,
                      display: "flex",
                    }}
                  >
                    {r.rating.toFixed(1)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: DIM,
            paddingTop: 30,
          }}
        >
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            {userName ? `Por ${userName}` : "movierate-compare.vercel.app"}
          </div>
          {userName && (
            <div
              style={{
                fontSize: 18,
                opacity: 0.7,
                display: "flex",
              }}
            >
              movierate-compare.vercel.app
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        // Cache corto — la lista del user puede cambiar pronto
        "Cache-Control": "private, max-age=300",
      },
    }
  );
}
