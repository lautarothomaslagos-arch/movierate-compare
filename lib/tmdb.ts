import {
  tmdbDiscoverResponseSchema,
  tmdbGenresResponseSchema,
  tmdbMovieDetailsSchema,
  tmdbMultiResponseSchema,
  tmdbPersonMovieCreditsSchema,
  tmdbPersonSchema,
  tmdbPersonTvCreditsSchema,
  tmdbRecommendationsResponseSchema,
  tmdbSearchResponseSchema,
  tmdbTvDetailsSchema,
  tmdbTvDiscoverResponseSchema,
  tmdbTvRecommendationsResponseSchema,
  tmdbWatchProvidersResponseSchema,
  type TmdbDiscoverResponse,
  type TmdbGenresResponse,
  type TmdbMovieDetails,
  type TmdbMultiResponse,
  type TmdbPerson,
  type TmdbPersonMovieCredits,
  type TmdbPersonTvCredits,
  type TmdbRecommendationsResponse,
  type TmdbSearchResponse,
  type TmdbTvDetails,
  type TmdbTvDiscoverResponse,
  type TmdbTvRecommendationsResponse,
  type TmdbWatchProvidersResponse,
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

// ----- Personas (actores/crew) -----

export function getPersonDetails(personId: number): Promise<TmdbPerson> {
  return tmdbFetch(`/person/${personId}`, {}, tmdbPersonSchema);
}

export function getPersonMovieCredits(
  personId: number
): Promise<TmdbPersonMovieCredits> {
  return tmdbFetch(
    `/person/${personId}/movie_credits`,
    {},
    tmdbPersonMovieCreditsSchema
  );
}

// ----- Géneros y discover -----

export function getGenres(): Promise<TmdbGenresResponse> {
  return tmdbFetch("/genre/movie/list", {}, tmdbGenresResponseSchema);
}

export type DiscoverSort = "popular" | "top" | "recent";

export function discoverByGenre(
  genreId: number,
  page: number = 1,
  sort: DiscoverSort = "popular"
): Promise<TmdbDiscoverResponse> {
  const params: Record<string, string | number> = {
    with_genres: genreId,
    page,
    include_adult: "false",
  };

  switch (sort) {
    case "top":
      // Mejor puntuadas con mínimo de votos para excluir rarezas
      params.sort_by = "vote_average.desc";
      params["vote_count.gte"] = 500;
      break;
    case "recent":
      // Más nuevas, pero filtrando pelis que ya se estrenaron
      params.sort_by = "primary_release_date.desc";
      params["primary_release_date.lte"] = new Date()
        .toISOString()
        .slice(0, 10);
      params["vote_count.gte"] = 5;
      break;
    case "popular":
    default:
      params.sort_by = "popularity.desc";
  }

  return tmdbFetch("/discover/movie", params, tmdbDiscoverResponseSchema);
}

// ----- Watch providers (JustWatch via TMDB) -----

export function getWatchProviders(
  movieId: number
): Promise<TmdbWatchProvidersResponse> {
  // El endpoint NO acepta language; devuelve TODOS los países en `results`.
  // Filtramos por región en el consumer.
  return tmdbFetch(
    `/movie/${movieId}/watch/providers`,
    {},
    tmdbWatchProvidersResponseSchema
  );
}

// ----- TV / Series -----

export function searchMulti(query: string): Promise<TmdbMultiResponse> {
  return tmdbFetch(
    "/search/multi",
    { query, include_adult: "false", page: 1 },
    tmdbMultiResponseSchema
  );
}

export function getTvDetails(tvId: number): Promise<TmdbTvDetails> {
  return tmdbFetch(
    `/tv/${tvId}`,
    { append_to_response: "credits,external_ids" },
    tmdbTvDetailsSchema
  );
}

export function getTvRecommendations(
  tvId: number
): Promise<TmdbTvRecommendationsResponse> {
  return tmdbFetch(
    `/tv/${tvId}/recommendations`,
    {},
    tmdbTvRecommendationsResponseSchema
  );
}

export function getTvGenres(): Promise<TmdbGenresResponse> {
  return tmdbFetch("/genre/tv/list", {}, tmdbGenresResponseSchema);
}

export function discoverTvByGenre(
  genreId: number,
  page: number = 1,
  sort: DiscoverSort = "popular"
): Promise<TmdbTvDiscoverResponse> {
  const params: Record<string, string | number> = {
    with_genres: genreId,
    page,
    include_adult: "false",
  };
  switch (sort) {
    case "top":
      params.sort_by = "vote_average.desc";
      params["vote_count.gte"] = 200; // series tienen menos votos que pelis
      break;
    case "recent":
      params.sort_by = "first_air_date.desc";
      params["first_air_date.lte"] = new Date().toISOString().slice(0, 10);
      params["vote_count.gte"] = 5;
      break;
    case "popular":
    default:
      params.sort_by = "popularity.desc";
  }
  return tmdbFetch("/discover/tv", params, tmdbTvDiscoverResponseSchema);
}

export function getTvWatchProviders(
  tvId: number
): Promise<TmdbWatchProvidersResponse> {
  return tmdbFetch(
    `/tv/${tvId}/watch/providers`,
    {},
    tmdbWatchProvidersResponseSchema
  );
}

export function getPersonTvCredits(
  personId: number
): Promise<TmdbPersonTvCredits> {
  return tmdbFetch(
    `/person/${personId}/tv_credits`,
    {},
    tmdbPersonTvCreditsSchema
  );
}

// Helper para perfiles de personas (la imagen del actor).
export function profileUrl(
  profilePath: string | null | undefined,
  size: "w45" | "w185" | "h632" | "original" = "w185"
): string | null {
  if (!profilePath) return null;
  return `${TMDB_IMG_BASE}/${size}${profilePath}`;
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
