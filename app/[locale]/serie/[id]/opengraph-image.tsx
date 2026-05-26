import { ImageResponse } from "next/og";

import { getTvDetails, getYear } from "@/lib/tmdb";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

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
          background: "#0a0a0a",
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
              opacity: 0.3,
              filter: "blur(20px)",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.75) 100%)",
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
              }}
            />
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 20,
              color: "white",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  color: "#a78bfa",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                MovieRate Compare
              </div>
              <div
                style={{
                  fontSize: 18,
                  background: "rgba(168, 85, 247, 0.25)",
                  border: "1px solid rgba(168, 85, 247, 0.5)",
                  padding: "4px 12px",
                  borderRadius: 999,
                  color: "#c084fc",
                  fontWeight: 700,
                }}
              >
                SERIE
              </div>
            </div>

            <div
              style={{
                fontSize: 68,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              {tv.name}
            </div>

            <div
              style={{
                fontSize: 30,
                color: "#a3a3a3",
                display: "flex",
                gap: 16,
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
                  gap: 14,
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "2px solid rgba(16, 185, 129, 0.4)",
                  padding: "12px 24px",
                  borderRadius: 12,
                  marginTop: 8,
                  width: "fit-content",
                }}
              >
                <span style={{ fontSize: 40 }}>⭐</span>
                <span
                  style={{
                    fontSize: 56,
                    fontWeight: 900,
                    color: "#34d399",
                  }}
                >
                  {rating.toFixed(1)}
                </span>
                <span
                  style={{
                    fontSize: 28,
                    color: "#a3a3a3",
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

function DefaultOg() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)",
        color: "white",
      }}
    >
      <div style={{ fontSize: 96, fontWeight: 900 }}>MovieRate Compare</div>
    </div>
  );
}
