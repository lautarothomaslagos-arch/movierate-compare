import { ImageResponse } from "next/og";

import { getTvDetails, getYear } from "@/lib/tmdb";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

// Brand (mismo sistema que /movie/opengraph-image)
const BRASS = "#e0b870";
const CREAM = "#f3e7c8";
const NIGHT = "#0a0804";
const DIM = "#a89878";
const STAR_PATH =
  "M50 10 L40.60 37.06 L11.96 37.64 L34.78 54.94 L26.49 82.36 L50 66 L73.51 82.36 L65.22 54.94 L88.04 37.64 L59.41 37.06 Z";

export default async function TvOgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tvId = parseInt(id, 10);

  let tv;
  try {
    tv = await getTvDetails(tvId);
  } catch {
    return new ImageResponse(<DefaultOg />, size);
  }

  const year = getYear(tv.first_air_date);
  const rating = tv.vote_average ?? 0;
  const fillPct = rating > 0 ? Math.min(1, Math.max(0, rating / 10)) : 0.74;
  const fillY = 10 + (1 - fillPct) * 72.36;

  const poster = tv.poster_path
    ? `https://image.tmdb.org/t/p/w500${tv.poster_path}`
    : null;
  const backdrop = tv.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${tv.backdrop_path}`
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
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(10,8,4,0.96) 0%, rgba(10,8,4,0.72) 100%)",
            display: "flex",
          }}
        />

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
              gap: 20,
              color: CREAM,
            }}
          >
            {/* Lockup + badge "Serie" */}
            <div
              style={{ display: "flex", alignItems: "center", gap: 14 }}
            >
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
              <div
                style={{
                  fontSize: 16,
                  background: "rgba(224, 184, 112, 0.18)",
                  border: "1px solid rgba(224, 184, 112, 0.45)",
                  padding: "4px 14px",
                  borderRadius: 999,
                  color: BRASS,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                Serie
              </div>
            </div>

            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                lineHeight: 1.04,
                letterSpacing: "-0.02em",
                color: CREAM,
              }}
            >
              {tv.name}
            </div>

            <div
              style={{
                fontSize: 30,
                color: DIM,
                display: "flex",
                gap: 14,
              }}
            >
              {year !== null && <span>{year}</span>}
              {tv.number_of_seasons && (
                <>
                  <span>·</span>
                  <span>
                    {tv.number_of_seasons}{" "}
                    {tv.number_of_seasons === 1 ? "temporada" : "temporadas"}
                  </span>
                </>
              )}
            </div>

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
