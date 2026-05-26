import { ImageResponse } from "next/og";

import { getMovieDetails, getYear } from "@/lib/tmdb";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

// Genera la imagen OG dinámicamente cuando alguien comparte el link.
// Next.js la sirve en /opengraph-image automáticamente.
// Imagen: backdrop blureado de fondo + poster a la izquierda + título grande
// + año + rating en card destacada.
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
    // Fallback: imagen genérica de la app
    return new ImageResponse(<DefaultOg />, size);
  }

  const year = getYear(movie.release_date);
  const rating = movie.vote_average ?? 0;
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
          background: "#0a0a0a",
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
              opacity: 0.3,
              filter: "blur(20px)",
            }}
          />
        )}
        {/* Overlay oscuro */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.75) 100%)",
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
              }}
            />
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 24,
              color: "white",
            }}
          >
            {/* Brand */}
            <div
              style={{
                fontSize: 24,
                color: "#a78bfa",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              MovieRate Compare
            </div>

            {/* Título */}
            <div
              style={{
                fontSize: 72,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              {movie.title}
            </div>

            {/* Año + género */}
            <div
              style={{
                fontSize: 32,
                color: "#a3a3a3",
                display: "flex",
                gap: 16,
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

            {/* Rating card */}
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
