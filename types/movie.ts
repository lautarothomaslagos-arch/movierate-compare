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

const productionCompanySchema = z.object({
  id: z.number(),
  name: z.string(),
  logo_path: z.string().nullable().optional(),
  origin_country: z.string().nullable().optional(),
});

const productionCountrySchema = z.object({
  iso_3166_1: z.string(),
  name: z.string(),
});

const spokenLanguageSchema = z.object({
  iso_639_1: z.string(),
  name: z.string(),
  english_name: z.string().nullable().optional(),
});

const belongsToCollectionSchema = z.object({
  id: z.number(),
  name: z.string(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
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
  budget: z.number().nullable().optional(),
  revenue: z.number().nullable().optional(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
  production_companies: z.array(productionCompanySchema).optional(),
  production_countries: z.array(productionCountrySchema).optional(),
  spoken_languages: z.array(spokenLanguageSchema).optional(),
  belongs_to_collection: belongsToCollectionSchema.nullable().optional(),
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
// TMDB: TV (series)
// =============================================================================
// Las series tienen estructura similar a pelis pero con campos únicos:
// - `name` en vez de `title`
// - `first_air_date` en vez de `release_date`
// - `number_of_seasons`, `number_of_episodes`, `status` ("Ended", "Returning Series")
// - `created_by` en vez de director (crew)

export const tmdbTvSearchSchema = z.object({
  id: z.number(),
  name: z.string(),
  original_name: z.string().nullable().optional(),
  first_air_date: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
  vote_average: z.number().nullable().optional(),
});

const tvCreatorSchema = z.object({
  id: z.number(),
  name: z.string(),
  profile_path: z.string().nullable().optional(),
});

const tvSeasonSummarySchema = z.object({
  id: z.number(),
  season_number: z.number(),
  name: z.string(),
  overview: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  air_date: z.string().nullable().optional(),
  episode_count: z.number().nullable().optional(),
  vote_average: z.number().nullable().optional(),
});

const tvNetworkSchema = z.object({
  id: z.number(),
  name: z.string(),
  logo_path: z.string().nullable().optional(),
  origin_country: z.string().nullable().optional(),
});

export const tmdbTvDetailsSchema = z.object({
  id: z.number(),
  external_ids: z
    .object({
      imdb_id: z.string().nullable().optional(),
    })
    .optional(),
  name: z.string(),
  original_name: z.string().nullable().optional(),
  first_air_date: z.string().nullable().optional(),
  last_air_date: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  number_of_seasons: z.number().nullable().optional(),
  number_of_episodes: z.number().nullable().optional(),
  episode_run_time: z.array(z.number()).optional(),
  status: z.string().nullable().optional(),
  in_production: z.boolean().nullable().optional(),
  // Próximo episodio al aire (Fase F.4): banner + sección home
  next_episode_to_air: z
    .object({
      id: z.number(),
      name: z.string().nullable().optional(),
      overview: z.string().nullable().optional(),
      air_date: z.string().nullable().optional(),
      episode_number: z.number().nullable().optional(),
      season_number: z.number().nullable().optional(),
      still_path: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  vote_average: z.number().nullable().optional(),
  vote_count: z.number().nullable().optional(),
  origin_country: z.array(z.string()).optional(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
  created_by: z.array(tvCreatorSchema).optional(),
  production_companies: z.array(productionCompanySchema).optional(),
  production_countries: z.array(productionCountrySchema).optional(),
  spoken_languages: z.array(spokenLanguageSchema).optional(),
  networks: z.array(tvNetworkSchema).optional(),
  seasons: z.array(tvSeasonSummarySchema).optional(),
  credits: z
    .object({
      cast: z
        .array(
          z.object({
            id: z.number(),
            name: z.string(),
            character: z.string().nullable().optional(),
            profile_path: z.string().nullable().optional(),
            order: z.number().nullable().optional(),
          })
        )
        .optional(),
    })
    .optional(),
});

// /collection/{id}
const collectionPartSchema = z.object({
  id: z.number(),
  title: z.string(),
  original_title: z.string().nullable().optional(),
  release_date: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  vote_average: z.number().nullable().optional(),
  overview: z.string().nullable().optional(),
});

export const tmdbCollectionResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  overview: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  parts: z.array(collectionPartSchema),
});

// /tv/{id}/season/{n}
const tvEpisodeSchema = z.object({
  id: z.number(),
  episode_number: z.number(),
  season_number: z.number(),
  name: z.string(),
  overview: z.string().nullable().optional(),
  air_date: z.string().nullable().optional(),
  still_path: z.string().nullable().optional(),
  vote_average: z.number().nullable().optional(),
  vote_count: z.number().nullable().optional(),
  runtime: z.number().nullable().optional(),
});

export const tmdbSeasonResponseSchema = z.object({
  id: z.number(),
  season_number: z.number(),
  name: z.string(),
  overview: z.string().nullable().optional(),
  air_date: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  episodes: z.array(tvEpisodeSchema),
});

// /movie/{id}/release_dates
const releaseDateEntrySchema = z.object({
  certification: z.string().nullable().optional(),
  iso_639_1: z.string().nullable().optional(),
  release_date: z.string(),
  type: z.number(),
  // type: 1=Premiere, 2=Theatrical (limited), 3=Theatrical, 4=Digital, 5=Physical, 6=TV
});

const releaseDateByCountrySchema = z.object({
  iso_3166_1: z.string(),
  release_dates: z.array(releaseDateEntrySchema),
});

export const tmdbReleaseDatesResponseSchema = z.object({
  id: z.number(),
  results: z.array(releaseDateByCountrySchema),
});

export type TmdbProductionCompany = z.infer<typeof productionCompanySchema>;
export type TmdbCollection = z.infer<typeof tmdbCollectionResponseSchema>;
export type TmdbSeason = z.infer<typeof tmdbSeasonResponseSchema>;
export type TmdbEpisode = z.infer<typeof tvEpisodeSchema>;
export type TmdbReleaseDates = z.infer<typeof tmdbReleaseDatesResponseSchema>;

export const tmdbTvDiscoverResponseSchema = z.object({
  page: z.number(),
  results: z.array(tmdbTvSearchSchema),
  total_results: z.number(),
  total_pages: z.number(),
});

export const tmdbTvRecommendationsResponseSchema = z.object({
  page: z.number(),
  results: z.array(tmdbTvSearchSchema),
  total_results: z.number(),
  total_pages: z.number(),
});

// Para filmografía de TV (similar a movie credits pero con campos de TV)
export const tmdbPersonTvCreditSchema = z.object({
  id: z.number(),
  name: z.string(),
  original_name: z.string().nullable().optional(),
  first_air_date: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  character: z.string().nullable().optional(),
  episode_count: z.number().nullable().optional(),
  popularity: z.number().nullable().optional(),
});

export const tmdbPersonTvCreditsSchema = z.object({
  id: z.number(),
  cast: z.array(tmdbPersonTvCreditSchema).optional(),
});

// /search/multi devuelve mezcla de movies, tv y people. Cada item tiene media_type.
const tmdbMultiMovieSchema = tmdbSearchMovieSchema.extend({
  media_type: z.literal("movie"),
});
const tmdbMultiTvSchema = tmdbTvSearchSchema.extend({
  media_type: z.literal("tv"),
});
const tmdbMultiPersonSchema = z.object({
  id: z.number(),
  media_type: z.literal("person"),
  name: z.string(),
  profile_path: z.string().nullable().optional(),
});

export const tmdbMultiResponseSchema = z.object({
  page: z.number(),
  results: z.array(
    z.union([tmdbMultiMovieSchema, tmdbMultiTvSchema, tmdbMultiPersonSchema])
  ),
  total_results: z.number(),
  total_pages: z.number(),
});

export type TmdbTvSearch = z.infer<typeof tmdbTvSearchSchema>;
export type TmdbTvDetails = z.infer<typeof tmdbTvDetailsSchema>;
export type TmdbTvDiscoverResponse = z.infer<typeof tmdbTvDiscoverResponseSchema>;
export type TmdbTvRecommendationsResponse = z.infer<
  typeof tmdbTvRecommendationsResponseSchema
>;
export type TmdbPersonTvCredit = z.infer<typeof tmdbPersonTvCreditSchema>;
export type TmdbPersonTvCredits = z.infer<typeof tmdbPersonTvCreditsSchema>;
export type TmdbMultiResponse = z.infer<typeof tmdbMultiResponseSchema>;

// =============================================================================
// TMDB: Trending
// =============================================================================
// /trending/all/{time_window} devuelve mezcla de movies + tv + people.
// Filtramos people en el consumer.

const tmdbTrendingMovieSchema = tmdbSearchMovieSchema.extend({
  media_type: z.literal("movie"),
});
const tmdbTrendingTvSchema = tmdbTvSearchSchema.extend({
  media_type: z.literal("tv"),
});
const tmdbTrendingPersonSchema = z.object({
  id: z.number(),
  media_type: z.literal("person"),
  name: z.string(),
  profile_path: z.string().nullable().optional(),
});

export const tmdbTrendingResponseSchema = z.object({
  page: z.number(),
  results: z.array(
    z.union([
      tmdbTrendingMovieSchema,
      tmdbTrendingTvSchema,
      tmdbTrendingPersonSchema,
    ])
  ),
  total_results: z.number(),
  total_pages: z.number(),
});

export type TmdbTrendingResponse = z.infer<typeof tmdbTrendingResponseSchema>;

// =============================================================================
// TMDB: Videos (trailers, clips, behind-the-scenes)
// =============================================================================

const tmdbVideoSchema = z.object({
  id: z.string(),
  key: z.string(), // YouTube video ID
  name: z.string(),
  site: z.string(), // "YouTube" o "Vimeo"
  type: z.string(), // "Trailer", "Teaser", "Clip", etc.
  official: z.boolean().optional(),
  iso_639_1: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
});

export const tmdbVideosResponseSchema = z.object({
  id: z.number(),
  results: z.array(tmdbVideoSchema),
});

export type TmdbVideo = z.infer<typeof tmdbVideoSchema>;
export type TmdbVideosResponse = z.infer<typeof tmdbVideosResponseSchema>;

// =============================================================================
// TMDB: Images (backdrops, posters)
// =============================================================================

const tmdbImageSchema = z.object({
  file_path: z.string(),
  aspect_ratio: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  iso_639_1: z.string().nullable().optional(),
  vote_average: z.number().optional(),
});

export const tmdbImagesResponseSchema = z.object({
  id: z.number(),
  backdrops: z.array(tmdbImageSchema).optional(),
  posters: z.array(tmdbImageSchema).optional(),
});

export type TmdbImage = z.infer<typeof tmdbImageSchema>;
export type TmdbImagesResponse = z.infer<typeof tmdbImagesResponseSchema>;

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
  filmaffinity?: PlatformRating | null; // legacy — removida del UI, se mantiene opcional por backward compat del cache
  errors: string[]; // qué fuentes fallaron, para debug
};
