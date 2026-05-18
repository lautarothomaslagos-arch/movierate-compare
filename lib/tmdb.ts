import {
  tmdbMovieDetailsSchema,
  tmdbRecommendationsResponseSchema,
  tmdbSearchResponseSchema,
  type TmdbMovieDetails,
  type TmdbRecommendationsResponse,
  type TmdbSearchResponse,
} from "@/types/movie";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_LANG = "es-AR";

// Helper que detecta si la key es un v4 Read Access Token (JWT) o v3 API key.
// - v4 token (lo que TMDB recomienda hoy) empieza con "eyJ" — va en header Authorization: Bearer
// - v3 key son 32 chars hex — va como query param ?api_key=
function buildAuth(): { headers: HeadersInit; queryKey: string | null } {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error("TMDB_API_KEY no está definida en .env.local");
  }
  if (key.startsWith("eyJ")) {
    return {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json;charset=utf-8",
      },
      queryKey: null,
    };
  }
  return {
    headers: { "Content-Type": "application/json;charset=utf-8" },
    queryKey: key,
  };
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const auth = buildAuth();
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("language", TMDB_LANG);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  if (auth.queryKey) url.searchParams.set("api_key", auth.queryKey);

  const res = await fetch(url.toString(), {
    headers: auth.headers,
    next: { revalidate: 60 * 60 }, // cache server-side 1h
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TMDB ${res.status} en ${path}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  return schema.parse(json);
}

export function searchMovies(query: string): Promise<TmdbSearchResponse> {
  return tmdbFetch(
    "/search/movie",
    { query, include_adult: "false", page: 1 },
    tmdbSearchResponseSchema
  );
}

export function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
  return tmdbFetch(
    `/movie/${tmdbId}`,
    { append_to_response: "credits" },
    tmdbMovieDetailsSchema
  );
}

export function getRecommendations(
  tmdbId: number
): Promise<TmdbRecommendationsResponse> {
  return tmdbFetch(
    `/movie/${tmdbId}/recommendations`,
    {},
    tmdbRecommendationsResponseSchema
  );
}

// Helpers de URL para los assets de TMDB
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(
  posterPath: string | null | undefined,
  size: "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original" = "w185"
): string | null {
  if (!posterPath) return null;
  return `${TMDB_IMG_BASE}/${size}${posterPath}`;
}

export function backdropUrl(
  backdropPath: string | null | undefined,
  size: "w300" | "w780" | "w1280" | "original" = "w1280"
): string | null {
  if (!backdropPath) return null;
  return `${TMDB_IMG_BASE}/${size}${backdropPath}`;
}

export function getYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const y = parseInt(dateStr.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}
