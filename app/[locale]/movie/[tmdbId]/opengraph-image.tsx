import { ImageResponse } from "next/og";

import { getMovieDetails, getYear } from "@/lib/tmdb";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

// Brand
const BRASS = "#e0b870";
const CREAM = "#f3e7c8";
const NIGHT = "#0a0804";
const DIM = "#a89878";
const STAR_PATH =
  "M50 10 L40.60 37.06 L11.96 37.64 L34.78 54.94 L26.49 82.36 L50 66 L73.51 82.36 L65.22 54.94 L88.04 37.64 L59.41 37.06 Z";

// La OG image se sirve cuando alguien comparte el link. Layout:
// backdrop blureado + poster izquierda + título + isotipo + rating con
// estrella de marca. Sistema Late Night, sin unicode ★ (evita errores
// de font load) — la estrella es la oficial vectorial con fill brass.
export default async function MovieOgImage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const { tmdbId } = await params;
  const id = parseInt(tmdbId, 10);

  let movie;
  try {
    movie = await getMovieDetails(id);
  } catch {
    return new ImageResponse(<DefaultOg />, size);
  }

  const year = getYear(movie.release_date);
  const rating = movie.vote_average ?? 0;
  // fillPct según la nota TMDB (0-10), default 0.74
  const fillPct = rating > 0 ? Math.min(1, Math.max(0, rating / 10)) : 0.74;
  const fillY = 10 + (1 - fillPct) * 72.36;

  const poster = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;
  const backdrop = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: NIGHT,
          position: "relative",
        }}
      >
        {/* Backdrop blureado */}
        {backdrop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdrop}
            alt=""
            width={1200}
            height={630}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.28,
              filter: "blur(20px)",
            }}
          />
        )}
        {/* Overlay warm dark */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(10,8,4,0.96) 0%, rgba(10,8,4,0.72) 100%)",
            display: "flex",
          }}
        />

        {/* Contenido */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            padding: 60,
            gap: 50,
            alignItems: "center",
          }}
        >
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt=""
              width={340}
              height={510}
              style={{
                width: 340,
                height: 510,
                borderRadius: 16,
                objectFit: "cover",
                boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                border: "1px solid #2a2218",
              }}
            />
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 22,
              color: CREAM,
            }}
          >
            {/* Lockup de marca: isotipo + wordmark */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <BrandStarSvg size={36} fillY={28.81} />
              <div
                style={{
                  fontSize: 22,
                  color: DIM,
                  letterSpacing: "0.18em",
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
                fontSize: 76,
                fontWeight: 700,
                lineHeight: 1.04,
                letterSpacing: "-0.02em",
                color: CREAM,
              }}
            >
              {movie.title}
            </div>

            {/* Año + género */}
            <div
              style={{
                fontSize: 30,
                color: DIM,
                display: "flex",
                gap: 14,
              }}
            >
              {year !== null && <span>{year}</span>}
              {movie.genres && movie.genres[0] && (
                <>
                  <span>·</span>
                  <span>{movie.genres[0].name}</span>
                </>
              )}
            </div>

            {/* Rating card con la estrella de marca llenada al rating real */}
            {rating > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  background: "rgba(224, 184, 112, 0.12)",
                  border: "2px solid rgba(224, 184, 112, 0.5)",
                  padding: "14px 26px",
                  borderRadius: 14,
                  marginTop: 6,
                  width: "fit-content",
                }}
              >
                <BrandStarSvg size={56} fillY={fillY} />
                <span
                  style={{
                    fontSize: 60,
                    fontWeight: 700,
                    color: BRASS,
                    fontStyle: "italic",
                  }}
                >
                  {rating.toFixed(1)}
                </span>
                <span
                  style={{
                    fontSize: 28,
                    color: DIM,
                    marginLeft: -6,
                  }}
                >
                  /10
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    size
  );
}

// Estrella inline en JSX para ImageResponse. Replica del isotipo oficial
// con fill brass paramétrico (fillY se calcula en el caller). No usamos
// el componente BrandStar porque ImageResponse necesita JSX literal sin
// hooks como useId, y queremos control fino del tamaño.
function BrandStarSvg({ size, fillY }: { size: number; fillY: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <clipPath id="og-star-clip">
          <path d={STAR_PATH} />
        </clipPath>
      </defs>
      <path d={STAR_PATH} fill={CREAM} fillOpacity={0.16} />
      <g clipPath="url(#og-star-clip)">
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

// Fallback cuando TMDB falla. Estrella centrada + wordmark.
function DefaultOg() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: NIGHT,
        gap: 30,
      }}
    >
      <BrandStarSvg size={180} fillY={28.81} />
      <div
        style={{
          fontSize: 64,
          color: CREAM,
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          fontWeight: 600,
        }}
      >
        <span>MovieRate</span>
        <span style={{ color: DIM, fontSize: 48 }}>Compare</span>
        <span style={{ color: BRASS }}>.</span>
      </div>
    </div>
  );
}
