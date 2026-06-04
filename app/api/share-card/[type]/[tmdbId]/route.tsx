import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { getMovieDetails, getTvDetails, getYear } from "@/lib/tmdb";

// GET /api/share-card/[type]/[tmdbId]?rating=8.4&name=Lautaro
//
// Genera una imagen PNG 1080×1080 (cuadrada, ideal para feed) con:
//   - Backdrop blureado de la peli/serie
//   - Poster a la izquierda
//   - Wordmark "MovieRate Compare." arriba
//   - Estrella de marca llenada al rating exacto (vectorial, no unicode)
//   - Nota grande en serif italic + título + año
//
// Inputs:
//   type: "movie" | "tv"
//   tmdbId: id de TMDB
//   rating: número 0-10 del user (query param)
//   name (opcional): nombre del user para "Por @Lautaro"
//
// Performance: cache 24h con Vercel CDN (params determinísticos → cache hit).

export const runtime = "nodejs";

const SIZE = { width: 1080, height: 1080 };
const BRASS = "#e0b870";
const CREAM = "#f3e7c8";
const NIGHT = "#0a0804";
const DIM = "#a89878";

const STAR_PATH =
  "M50 10 L40.60 37.06 L11.96 37.64 L34.78 54.94 L26.49 82.36 L50 66 L73.51 82.36 L65.22 54.94 L88.04 37.64 L59.41 37.06 Z";

function clampRating(r: number): number {
  if (!Number.isFinite(r)) return 0;
  return Math.max(0, Math.min(10, r));
}

// Estrella inline en JSX para Satori. fillY se calcula del rating.
function BrandStarSvg({ size, fillY }: { size: number; fillY: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <clipPath id="sc-star-clip">
          <path d={STAR_PATH} />
        </clipPath>
      </defs>
      <path d={STAR_PATH} fill={CREAM} fillOpacity={0.16} />
      <g clipPath="url(#sc-star-clip)">
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; tmdbId: string }> }
) {
  const { type, tmdbId } = await params;
  const id = parseInt(tmdbId, 10);
  if (!Number.isFinite(id)) {
    return new Response("invalid tmdb id", { status: 400 });
  }
  if (type !== "movie" && type !== "tv") {
    return new Response("invalid type", { status: 400 });
  }

  const rawRating = parseFloat(
    request.nextUrl.searchParams.get("rating") ?? "0"
  );
  const rating = clampRating(rawRating);
  const userName = request.nextUrl.searchParams.get("name")?.trim() || null;

  // Cargar detalles del título
  let title = "";
  let year: number | null = null;
  let backdrop: string | null = null;
  let poster: string | null = null;

  try {
    if (type === "movie") {
      const m = await getMovieDetails(id);
      title = m.title;
      year = getYear(m.release_date);
      backdrop = m.backdrop_path ?? null;
      poster = m.poster_path ?? null;
    } else {
      const tv = await getTvDetails(id);
      title = tv.name;
      year = getYear(tv.first_air_date);
      backdrop = tv.backdrop_path ?? null;
      poster = tv.poster_path ?? null;
    }
  } catch (err) {
    console.warn("[share-card] tmdb fetch failed:", err);
    return new Response("not found", { status: 404 });
  }

  // Geometría de la estrella según el rating del user
  const fillPct = rating / 10;
  const fillY = 10 + (1 - fillPct) * 72.36;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: NIGHT,
          position: "relative",
          padding: 0,
        }}
      >
        {/* Backdrop blureado de fondo */}
        {backdrop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://image.tmdb.org/t/p/w1280${backdrop}`}
            alt=""
            width={1080}
            height={1080}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.25,
              filter: "blur(24px)",
            }}
          />
        )}
        {/* Overlay warm dark */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(10,8,4,0.78) 0%, rgba(10,8,4,0.94) 100%)",
            display: "flex",
          }}
        />

        {/* Wordmark arriba */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "48px 60px 0 60px",
          }}
        >
          <BrandStarSvg size={36} fillY={28.81} />
          <div
            style={{
              fontSize: 22,
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

        {/* Cuerpo central: poster + nota a la derecha */}
        <div
          style={{
            position: "relative",
            flex: 1,
            display: "flex",
            alignItems: "center",
            padding: "20px 60px 0 60px",
            gap: 50,
          }}
        >
          {/* Poster */}
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://image.tmdb.org/t/p/w500${poster}`}
              alt=""
              width={340}
              height={510}
              style={{
                width: 340,
                height: 510,
                borderRadius: 18,
                objectFit: "cover",
                boxShadow: "0 24px 60px rgba(0,0,0,0.85)",
                border: "1px solid #2a2218",
              }}
            />
          )}

          {/* Bloque de la nota */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 18,
              color: CREAM,
            }}
          >
            <div
              style={{
                fontSize: 16,
                color: DIM,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              Mi nota
            </div>

            {/* Estrella grande + nota gigante */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
              }}
            >
              <BrandStarSvg size={130} fillY={fillY} />
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 168,
                    fontStyle: "italic",
                    fontWeight: 700,
                    color: BRASS,
                    lineHeight: 0.92,
                  }}
                >
                  {rating.toFixed(1)}
                </span>
                <span
                  style={{
                    fontSize: 38,
                    color: DIM,
                  }}
                >
                  /10
                </span>
              </div>
            </div>

            {/* Título */}
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                lineHeight: 1.04,
                letterSpacing: "-0.02em",
                color: CREAM,
                display: "flex",
              }}
            >
              {title}
            </div>

            {year !== null && (
              <div
                style={{
                  fontSize: 26,
                  color: DIM,
                  letterSpacing: "0.14em",
                  display: "flex",
                  gap: 12,
                }}
              >
                <span>{year}</span>
                <span style={{ color: BRASS }}>·</span>
                <span>{type === "tv" ? "Serie" : "Peli"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer con la firma del user (si la hay) */}
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 60px 48px 60px",
            color: DIM,
          }}
        >
          <div
            style={{
              fontSize: 18,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            {userName ? `Por ${userName}` : "movierate-compare.vercel.app"}
          </div>
          {userName && (
            <div
              style={{
                fontSize: 16,
                color: DIM,
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
        // Cache 24h en CDN + browser (mismo input = misma imagen)
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
      },
    }
  );
}
