import { getMovieDetails } from "@/lib/tmdb";
import {
  findRtScore,
  getOmdbByImdbId,
  parseImdbRating,
  parseImdbVotes,
  parseMetascore,
} from "@/lib/omdb";
import { getLetterboxdRating } from "@/lib/letterboxd";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  PlatformRating,
  RatingsResponse,
  TmdbMovieDetails,
} from "@/types/movie";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

// Helpers de normalización
function rate10(score: number): PlatformRating {
  return {
    score10: Math.round(score * 10) / 10,
    score100: Math.round(score * 10),
  };
}

function rate100(score: number): PlatformRating {
  return {
    score10: Math.round((score / 10) * 10) / 10,
    score100: Math.round(score),
  };
}

// Resultado de TMDB → PlatformRating
function tmdbToPlatformRating(
  movie: TmdbMovieDetails
): PlatformRating | null {
  if (movie.vote_average === null || movie.vote_average === undefined) {
    return null;
  }
  return {
    ...rate10(movie.vote_average),
    votes: movie.vote_count ?? undefined,
    url: `https://www.themoviedb.org/movie/${movie.id}`,
  };
}

// =============================================================================
// CACHE — read-through con TTL de 7 días
// =============================================================================
// Tabla: ratings_cache (definida en supabase/schema.sql)
//   tmdb_id PK, imdb_rating, rt_score, metacritic_score, tmdb_score,
//   letterboxd_avg, filmaffinity_score, raw_data jsonb, updated_at
//
// RLS:
//   - select: pública (anon puede leer)
//   - insert/update: solo service_role (server con SUPABASE_SECRET_KEY)
// =============================================================================

type CacheRow = {
  tmdb_id: number;
  imdb_rating: number | null;
  rt_score: number | null;
  metacritic_score: number | null;
  tmdb_score: number | null;
  letterboxd_avg: number | null;
  filmaffinity_score: number | null;
  raw_data: Omit<RatingsResponse, "errors" | "tmdbId"> | null;
  updated_at: string; // ISO string
};

async function readCache(
  tmdbId: number
): Promise<RatingsResponse | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("ratings_cache")
      .select(
        "tmdb_id, imdb_rating, rt_score, metacritic_score, tmdb_score, letterboxd_avg, filmaffinity_score, raw_data, updated_at"
      )
      .eq("tmdb_id", tmdbId)
      .maybeSingle<CacheRow>();

    if (error) {
      console.warn("[cache:read] supabase error:", error.message);
      return null;
    }
    if (!data) return null;

    const ageMs = Date.now() - new Date(data.updated_at).getTime();
    if (ageMs > CACHE_TTL_MS) {
      // Stale — devolvemos null para forzar refetch
      return null;
    }

    // Reconstruimos el shape de RatingsResponse desde raw_data (más completo
    // que las columnas, incluye votos y URLs).
    if (data.raw_data) {
      return {
        tmdbId,
        imdb: data.raw_data.imdb ?? null,
        rt: data.raw_data.rt ?? null,
        metacritic: data.raw_data.metacritic ?? null,
        tmdb: data.raw_data.tmdb ?? null,
        letterboxd: data.raw_data.letterboxd ?? null,
        filmaffinity: data.raw_data.filmaffinity ?? null,
        errors: [],
      };
    }

    // Fallback: si por alguna razón raw_data está vacío pero hay columnas,
    // reconstruimos sin votos ni URLs (no debería pasar normalmente).
    return {
      tmdbId,
      imdb:
        data.imdb_rating !== null
          ? rate10(data.imdb_rating)
          : null,
      rt:
        data.rt_score !== null
          ? rate100(data.rt_score)
          : null,
      metacritic:
        data.metacritic_score !== null
          ? rate100(data.metacritic_score)
          : null,
      tmdb:
        data.tmdb_score !== null
          ? rate10(data.tmdb_score)
          : null,
      letterboxd:
        data.letterboxd_avg !== null
          ? rate10(data.letterboxd_avg)
          : null,
      filmaffinity:
        data.filmaffinity_score !== null
          ? rate100(data.filmaffinity_score)
          : null,
      errors: [],
    };
  } catch (err) {
    console.warn("[cache:read] threw:", err);
    return null;
  }
}

async function writeCache(ratings: RatingsResponse): Promise<void> {
  try {
    const supabase = createServiceClient();
    // raw_data sin errors ni tmdbId (no aportan al cache)
    const { errors, tmdbId, ...rest } = ratings;
    void errors;
    const payload = {
      tmdb_id: tmdbId,
      imdb_rating: ratings.imdb?.score10 ?? null,
      rt_score: ratings.rt?.score100 ?? null,
      metacritic_score: ratings.metacritic?.score100 ?? null,
      tmdb_score: ratings.tmdb?.score10 ?? null,
      letterboxd_avg: ratings.letterboxd?.score10 ?? null,
      filmaffinity_score: ratings.filmaffinity?.score100 ?? null,
      raw_data: rest,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("ratings_cache")
      .upsert(payload, { onConflict: "tmdb_id" });
    if (error) {
      console.warn("[cache:write] supabase error:", error.message);
    }
  } catch (err) {
    console.warn("[cache:write] threw:", err);
  }
}

// =============================================================================
// Función central: dado un tmdbId, devuelve TODOS los ratings normalizados.
// 1. Lee de Supabase. Si hay row fresco (< 7 días) → devuelve.
// 2. Si no → fetch TMDB + OMDb en paralelo (con Promise.allSettled para
//    aislar fallas), guarda en cache, devuelve.
// Si Supabase está caído en lectura/escritura, igual sirve el resultado del
// fetch en vivo — el cache es optimización, no requisito.
// =============================================================================
export async function getRatings(tmdbId: number): Promise<RatingsResponse> {
  // 1. Intentamos cache primero
  const cached = await readCache(tmdbId);
  if (cached) return cached;

  // 2. Cache miss → fetch en vivo
  const errors: string[] = [];
  const result: RatingsResponse = {
    tmdbId,
    imdb: null,
    rt: null,
    metacritic: null,
    tmdb: null,
    letterboxd: null,
    // filmaffinity removida — quedaba bloqueada por Cloudflare
    errors,
  };

  let tmdbDetails: TmdbMovieDetails | null = null;
  try {
    tmdbDetails = await getMovieDetails(tmdbId);
    result.tmdb = tmdbToPlatformRating(tmdbDetails);
  } catch (err) {
    errors.push(`tmdb: ${err instanceof Error ? err.message : String(err)}`);
    return result; // sin TMDB no podemos seguir, tampoco cacheamos un fail total
  }

  // Disparamos OMDb + Letterboxd en paralelo con Promise.allSettled — cualquier
  // fuente que falle queda en null y las demás siguen funcionando.
  // Filmaffinity se eliminó del flow porque está bloqueado por Cloudflare.
  const imdbId = tmdbDetails.imdb_id ?? null;

  const [omdbSettled, letterboxdSettled] = await Promise.allSettled([
    imdbId
      ? getOmdbByImdbId(imdbId)
      : Promise.reject(new Error("tmdb-no-imdb-id")),
    getLetterboxdRating(
      tmdbDetails.original_title ?? tmdbDetails.title,
      tmdbDetails.title
    ),
  ]);

  // OMDb → imdb / rt / metacritic
  if (omdbSettled.status === "fulfilled") {
    const omdb = omdbSettled.value;
    if (omdb.Response === "True") {
      const imdbScore = parseImdbRating(omdb.imdbRating);
      const imdbVotes = parseImdbVotes(omdb.imdbVotes);
      const metaScore = parseMetascore(omdb.Metascore);
      const rtScore = findRtScore(omdb.Ratings);

      if (imdbScore !== null && imdbId) {
        result.imdb = {
          ...rate10(imdbScore),
          votes: imdbVotes ?? undefined,
          url: `https://www.imdb.com/title/${imdbId}/`,
        };
      }
      // Para los slugs de RT y Metacritic preferimos `original_title` porque
      // ambos sitios usan el título original en inglés (no la traducción local).
      // Si TMDB no nos da original_title caemos al title (título traducido).
      const slugSource = tmdbDetails.original_title ?? tmdbDetails.title;

      if (metaScore !== null) {
        result.metacritic = {
          ...rate100(metaScore),
          url: slugSource
            ? `https://www.metacritic.com/movie/${slugForMetacritic(slugSource)}`
            : undefined,
        };
      }
      if (rtScore !== null) {
        result.rt = {
          ...rate100(rtScore),
          url: slugSource
            ? `https://www.rottentomatoes.com/m/${slugForRottenTomatoes(slugSource)}`
            : undefined,
        };
      }
    } else {
      errors.push(`omdb: ${omdb.Error ?? "not found"}`);
    }
  } else {
    errors.push(
      `omdb: ${omdbSettled.reason instanceof Error ? omdbSettled.reason.message : String(omdbSettled.reason)}`
    );
  }

  // Letterboxd
  if (letterboxdSettled.status === "fulfilled" && letterboxdSettled.value) {
    result.letterboxd = {
      ...rate10(letterboxdSettled.value.score10),
      url: letterboxdSettled.value.url,
    };
  } else if (letterboxdSettled.status === "rejected") {
    errors.push("letterboxd: rejected");
  }

  // 3. Guardamos en cache (await para asegurar que la próxima request lo vea,
  // aunque si falla no rompemos la respuesta).
  await writeCache(result);

  return result;
}

// Slugs aproximados para links. RT y Metacritic no exponen una API de "find by id"
// gratis, así que armamos un guess. Si el link rompe, no es crítico — el rating
// igual se muestra.
function slugForRottenTomatoes(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function slugForMetacritic(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
