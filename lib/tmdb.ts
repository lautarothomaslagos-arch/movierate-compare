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
  tmdbCollectionResponseSchema,
  tmdbImagesResponseSchema,
  tmdbReleaseDatesResponseSchema,
  tmdbSeasonResponseSchema,
  tmdbTrendingResponseSchema,
  tmdbTvDetailsSchema,
  tmdbVideosResponseSchema,
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
  type TmdbCollection,
  type TmdbImagesResponse,
  type TmdbReleaseDates,
  type TmdbSeason,
  type TmdbTrendingResponse,
  type TmdbTvDetails,
  type TmdbVideosResponse,
  type TmdbTvDiscoverResponse,
  type TmdbTvRecommendationsResponse,
  type TmdbWatchProvidersResponse,
} from "@/types/movie";
import { getLocale } from "next-intl/server";

const TMDB_BASE = "https://api.themoviedb.org/3";

// Mapeo de locale next-intl → código TMDB.
// TMDB acepta códigos ISO 639-1 con sufijo opcional de región (es-AR, en-US).
const LOCALE_TO_TMDB: Record<string, string> = {
  es: "es-AR",
  en: "en-US",
};

// Resuelve el lang para TMDB. Si no hay request context (raro pero pasa
// en algunos casos de prerender), default a es-AR.
async function getTmdbLang(): Promise<string> {
  try {
    const locale = await getLocale();
    return LOCALE_TO_TMDB[locale] ?? "es-AR";
  } catch {
    return "es-AR";
  }
}

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
  const lang = await getTmdbLang();
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("language", lang);
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

export type DiscoverFilters = {
  yearFrom?: number;
  yearTo?: number;
  minRating?: number; // 0-10
  runtimeBucket?: "short" | "normal" | "long"; // <90 / 90-150 / >150 min
};

export function discoverByGenre(
  genreId: number,
  page: number = 1,
  sort: DiscoverSort = "popular",
  filters: DiscoverFilters = {}
): Promise<TmdbDiscoverResponse> {
  const params: Record<string, string | number> = {
    with_genres: genreId,
    page,
    include_adult: "false",
  };

  switch (sort) {
    case "top":
      params.sort_by = "vote_average.desc";
      params["vote_count.gte"] = 500;
      break;
    case "recent":
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

  // Filtros avanzados
  if (filters.yearFrom) {
    params["primary_release_date.gte"] = `${filters.yearFrom}-01-01`;
  }
  if (filters.yearTo) {
    params["primary_release_date.lte"] = `${filters.yearTo}-12-31`;
  }
  if (filters.minRating !== undefined && filters.minRating > 0) {
    params["vote_average.gte"] = filters.minRating;
    // Si el user pide rating mínimo, también pedimos un mínimo de votos
    // para que no aparezcan rarezas con 1 voto de 10
    if (!params["vote_count.gte"]) {
      params["vote_count.gte"] = 100;
    }
  }
  if (filters.runtimeBucket === "short") {
    params["with_runtime.lte"] = 90;
    params["with_runtime.gte"] = 1; // excluir runtime 0 (data missing)
  } else if (filters.runtimeBucket === "normal") {
    params["with_runtime.gte"] = 90;
    params["with_runtime.lte"] = 150;
  } else if (filters.runtimeBucket === "long") {
    params["with_runtime.gte"] = 150;
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
  sort: DiscoverSort = "popular",
  filters: DiscoverFilters = {}
): Promise<TmdbTvDiscoverResponse> {
  const params: Record<string, string | number> = {
    with_genres: genreId,
    page,
    include_adult: "false",
  };
  switch (sort) {
    case "top":
      params.sort_by = "vote_average.desc";
      params["vote_count.gte"] = 200;
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

  if (filters.yearFrom) {
    params["first_air_date.gte"] = `${filters.yearFrom}-01-01`;
  }
  if (filters.yearTo) {
    params["first_air_date.lte"] = `${filters.yearTo}-12-31`;
  }
  if (filters.minRating !== undefined && filters.minRating > 0) {
    params["vote_average.gte"] = filters.minRating;
    if (!params["vote_count.gte"]) {
      params["vote_count.gte"] = 50;
    }
  }
  // runtime no se usa en TV (los episodios varían mucho)

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

// ----- Trending -----

export function getTrending(
  timeWindow: "day" | "week" = "day"
): Promise<TmdbTrendingResponse> {
  return tmdbFetch(
    `/trending/all/${timeWindow}`,
    {},
    tmdbTrendingResponseSchema
  );
}

// ----- Videos (trailers) e Images (galería) -----

export function getMovieVideos(movieId: number): Promise<TmdbVideosResponse> {
  return tmdbFetch(`/movie/${movieId}/videos`, {}, tmdbVideosResponseSchema);
}

export function getTvVideos(tvId: number): Promise<TmdbVideosResponse> {
  return tmdbFetch(`/tv/${tvId}/videos`, {}, tmdbVideosResponseSchema);
}

// /images NO acepta language (devuelve todas las del archivo).
// Si querés filtrar por idioma, hacelo en el consumer mirando iso_639_1.
export function getMovieImages(movieId: number): Promise<TmdbImagesResponse> {
  return tmdbFetch(`/movie/${movieId}/images`, {}, tmdbImagesResponseSchema);
}

export function getTvImages(tvId: number): Promise<TmdbImagesResponse> {
  return tmdbFetch(`/tv/${tvId}/images`, {}, tmdbImagesResponseSchema);
}

// ----- Top rated discover (general, sin filtrar por género) -----

// Filtros opcionales por rango de años para /top (decade picker).
export type TopYearRange = {
  yearFrom?: number;
  yearTo?: number;
};

export function discoverTopMovies(
  page: number = 1,
  minVotes: number = 2000,
  range: TopYearRange = {}
): Promise<TmdbDiscoverResponse> {
  const params: Record<string, string | number> = {
    page,
    sort_by: "vote_average.desc",
    "vote_count.gte": minVotes,
    include_adult: "false",
  };
  if (range.yearFrom)
    params["primary_release_date.gte"] = `${range.yearFrom}-01-01`;
  if (range.yearTo)
    params["primary_release_date.lte"] = `${range.yearTo}-12-31`;
  return tmdbFetch("/discover/movie", params, tmdbDiscoverResponseSchema);
}

export function discoverTopTv(
  page: number = 1,
  minVotes: number = 500,
  range: TopYearRange = {}
): Promise<TmdbTvDiscoverResponse> {
  const params: Record<string, string | number> = {
    page,
    sort_by: "vote_average.desc",
    "vote_count.gte": minVotes,
    include_adult: "false",
  };
  if (range.yearFrom) params["first_air_date.gte"] = `${range.yearFrom}-01-01`;
  if (range.yearTo) params["first_air_date.lte"] = `${range.yearTo}-12-31`;
  return tmdbFetch("/discover/tv", params, tmdbTvDiscoverResponseSchema);
}

// ----- Collection / saga -----

export function getCollection(
  collectionId: number
): Promise<TmdbCollection> {
  return tmdbFetch(
    `/collection/${collectionId}`,
    {},
    tmdbCollectionResponseSchema
  );
}

// ----- TV season details (episodes) -----

export function getTvSeason(
  tvId: number,
  seasonNumber: number
): Promise<TmdbSeason> {
  return tmdbFetch(
    `/tv/${tvId}/season/${seasonNumber}`,
    {},
    tmdbSeasonResponseSchema
  );
}

// ----- Release dates (movie) -----

export function getMovieReleaseDates(
  movieId: number
): Promise<TmdbReleaseDates> {
  return tmdbFetch(
    `/movie/${movieId}/release_dates`,
    {},
    tmdbReleaseDatesResponseSchema
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
