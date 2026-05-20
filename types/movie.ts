import { z } from "zod";

// =============================================================================
// TMDB
// =============================================================================
// .nullable().optional() en campos que TMDB devuelve null para pelis poco
// populares (poster_path, runtime, etc.)
// =============================================================================

export const tmdbSearchMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string().nullable().optional(),
  release_date: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
  vote_average: z.number().nullable().optional(),
});

export const tmdbSearchResponseSchema = z.object({
  page: z.number(),
  results: z.array(tmdbSearchMovieSchema),
  total_results: z.number(),
  total_pages: z.number(),
});

const castMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  character: z.string().nullable().optional(),
  profile_path: z.string().nullable().optional(),
  order: z.number().nullable().optional(),
});

const crewMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  job: z.string(),
  department: z.string().nullable().optional(),
});

export const tmdbMovieDetailsSchema = z.object({
  id: z.number(),
  imdb_id: z.string().nullable().optional(),
  title: z.string(),
  original_title: z.string().nullable().optional(),
  release_date: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  runtime: z.number().nullable().optional(),
  vote_average: z.number().nullable().optional(),
  vote_count: z.number().nullable().optional(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
  credits: z
    .object({
      cast: z.array(castMemberSchema).optional(),
      crew: z.array(crewMemberSchema).optional(),
    })
    .optional(),
});

export const tmdbRecommendationsResponseSchema = z.object({
  page: z.number(),
  results: z.array(tmdbSearchMovieSchema),
  total_results: z.number(),
  total_pages: z.number(),
});

export type TmdbSearchMovie = z.infer<typeof tmdbSearchMovieSchema>;
export type TmdbSearchResponse = z.infer<typeof tmdbSearchResponseSchema>;
export type TmdbMovieDetails = z.infer<typeof tmdbMovieDetailsSchema>;
export type TmdbRecommendationsResponse = z.infer<
  typeof tmdbRecommendationsResponseSchema
>;

// =============================================================================
// TMDB: Person (actor/actress/crew)
// =============================================================================

export const tmdbPersonSchema = z.object({
  id: z.number(),
  name: z.string(),
  biography: z.string().nullable().optional(),
  birthday: z.string().nullable().optional(),
  deathday: z.string().nullable().optional(),
  place_of_birth: z.string().nullable().optional(),
  profile_path: z.string().nullable().optional(),
  known_for_department: z.string().nullable().optional(),
  popularity: z.number().nullable().optional(),
});

// Cada entry en `cast` o `crew` de movie_credits. Es como una peli con
// algunos extras (character, job, etc).
export const tmdbPersonMovieCreditSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string().nullable().optional(),
  release_date: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  vote_average: z.number().nullable().optional(),
  character: z.string().nullable().optional(),
  job: z.string().nullable().optional(),
  popularity: z.number().nullable().optional(),
});

export const tmdbPersonMovieCreditsSchema = z.object({
  id: z.number(),
  cast: z.array(tmdbPersonMovieCreditSchema).optional(),
  crew: z.array(tmdbPersonMovieCreditSchema).optional(),
});

export type TmdbPerson = z.infer<typeof tmdbPersonSchema>;
export type TmdbPersonMovieCredit = z.infer<typeof tmdbPersonMovieCreditSchema>;
export type TmdbPersonMovieCredits = z.infer<typeof tmdbPersonMovieCreditsSchema>;

// =============================================================================
// TMDB: Géneros + Discover
// =============================================================================

export const tmdbGenreSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const tmdbGenresResponseSchema = z.object({
  genres: z.array(tmdbGenreSchema),
});

export const tmdbDiscoverResponseSchema = z.object({
  page: z.number(),
  results: z.array(tmdbSearchMovieSchema),
  total_results: z.number(),
  total_pages: z.number(),
});

export type TmdbGenre = z.infer<typeof tmdbGenreSchema>;
export type TmdbGenresResponse = z.infer<typeof tmdbGenresResponseSchema>;
export type TmdbDiscoverResponse = z.infer<typeof tmdbDiscoverResponseSchema>;

// =============================================================================
// TMDB: Watch Providers (data de JustWatch via TMDB)
// =============================================================================
// El endpoint devuelve resultados por país: { results: { AR: {...}, MX: {...}, ... } }
// Para nuestro uso nos interesa: flatrate (incluido en suscripción), rent y buy.

const tmdbProviderSchema = z.object({
  provider_id: z.number(),
  provider_name: z.string(),
  logo_path: z.string().nullable().optional(),
  display_priority: z.number().nullable().optional(),
});

const tmdbWatchRegionSchema = z.object({
  link: z.string().optional(),
  flatrate: z.array(tmdbProviderSchema).optional(),
  rent: z.array(tmdbProviderSchema).optional(),
  buy: z.array(tmdbProviderSchema).optional(),
  free: z.array(tmdbProviderSchema).optional(),
  ads: z.array(tmdbProviderSchema).optional(),
});

export const tmdbWatchProvidersResponseSchema = z.object({
  id: z.number(),
  results: z.record(z.string(), tmdbWatchRegionSchema),
});

export type TmdbProvider = z.infer<typeof tmdbProviderSchema>;
export type TmdbWatchRegion = z.infer<typeof tmdbWatchRegionSchema>;
export type TmdbWatchProvidersResponse = z.infer<
  typeof tmdbWatchProvidersResponseSchema
>;

// =============================================================================
// OMDb
// =============================================================================
// OMDb devuelve TODO como string ("imdbRating": "7.8") así que parseamos a
// número en una capa más arriba (lib/omdb.ts). Acá solo validamos forma.
// Si Response === "False", la peli no existe en OMDb (o el imdb_id está mal).
// =============================================================================

const omdbRatingSchema = z.object({
  Source: z.string(),
  Value: z.string(),
});

export const omdbResponseSchema = z.union([
  z.object({
    Response: z.literal("True"),
    imdbID: z.string(),
    Title: z.string(),
    Year: z.string().optional(),
    imdbRating: z.string().optional(),
    imdbVotes: z.string().optional(),
    Metascore: z.string().optional(),
    Ratings: z.array(omdbRatingSchema).optional(),
  }),
  z.object({
    Response: z.literal("False"),
    Error: z.string().optional(),
  }),
]);

export type OmdbResponse = z.infer<typeof omdbResponseSchema>;

// =============================================================================
// Ratings normalizados (lo que consume la UI)
// =============================================================================
// Cada plataforma puede ser null si falló la fuente o si el dato no existe.
// score10 está en escala 0-10, score100 en 0-100. La UI los muestra como
// "X.X/10". El score100 nos sirve para comparar entre plataformas.
// =============================================================================

export type PlatformRating = {
  score10: number; // 0-10, con 1 decimal
  score100: number; // 0-100, entero
  votes?: number; // si la fuente lo expone
  url?: string; // link al original
};

export type RatingsResponse = {
  tmdbId: number;
  imdb: PlatformRating | null;
  rt: PlatformRating | null; // Rotten Tomatoes Tomatometer (% críticos)
  metacritic: PlatformRating | null;
  tmdb: PlatformRating | null;
  letterboxd: PlatformRating | null; // Paso 7
  filmaffinity: PlatformRating | null; // Paso 7
  errors: string[]; // qué fuentes fallaron, para debug
};
