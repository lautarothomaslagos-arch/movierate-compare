import { cache } from "react";

import { getTvDetails } from "@/lib/tmdb";
import {
  findRtScore,
  getOmdbByImdbId,
  parseImdbRating,
  parseImdbVotes,
  parseMetascore,
} from "@/lib/omdb";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  PlatformRating,
  RatingsResponse,
  TmdbTvDetails,
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

function tvToPlatformRating(tv: TmdbTvDetails): PlatformRating | null {
  if (tv.vote_average === null || tv.vote_average === undefined) return null;
  return {
    ...rate10(tv.vote_average),
    votes: tv.vote_count ?? undefined,
    url: `https://www.themoviedb.org/tv/${tv.id}`,
  };
}

// =============================================================================
// CACHE — read-through con TTL de 7 días (tabla tv_ratings_cache)
// =============================================================================
// Mismo patrón que lib/ratings.ts pero para series. La tabla es separada
// porque TMDB usa namespaces de IDs distintos entre movies y tv.
// =============================================================================

type TvCacheRow = {
  tmdb_id: number;
  imdb_rating: number | null;
  rt_score: number | null;
  metacritic_score: number | null;
  tmdb_score: number | null;
  raw_data: Omit<RatingsResponse, "errors" | "tmdbId"> | null;
  updated_at: string;
};

async function readCache(tvId: number): Promise<RatingsResponse | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("tv_ratings_cache")
      .select(
        "tmdb_id, imdb_rating, rt_score, metacritic_score, tmdb_score, raw_data, updated_at"
      )
      .eq("tmdb_id", tvId)
      .maybeSingle<TvCacheRow>();

    if (error) {
      console.warn("[tv-cache:read] supabase error:", error.message);
      return null;
    }
    if (!data) return null;

    const ageMs = Date.now() - new Date(data.updated_at).getTime();
    if (ageMs > CACHE_TTL_MS) return null;

    // Reconstruir desde raw_data si está
    if (data.raw_data) {
      return {
        tmdbId: tvId,
        imdb: data.raw_data.imdb ?? null,
        rt: data.raw_data.rt ?? null,
        metacritic: data.raw_data.metacritic ?? null,
        tmdb: data.raw_data.tmdb ?? null,
        letterboxd: null, // series no en Letterboxd
        errors: [],
      };
    }

    // Fallback: reconstruir desde columnas
    return {
      tmdbId: tvId,
      imdb:
        data.imdb_rating !== null ? rate10(data.imdb_rating) : null,
      rt: data.rt_score !== null ? rate100(data.rt_score) : null,
      metacritic:
        data.metacritic_score !== null
          ? rate100(data.metacritic_score)
          : null,
      tmdb: data.tmdb_score !== null ? rate10(data.tmdb_score) : null,
      letterboxd: null,
      errors: [],
    };
  } catch (err) {
    console.warn("[tv-cache:read] threw:", err);
    return null;
  }
}

async function writeCache(ratings: RatingsResponse): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { errors, tmdbId, ...rest } = ratings;
    void errors;
    const payload = {
      tmdb_id: tmdbId,
      imdb_rating: ratings.imdb?.score10 ?? null,
      rt_score: ratings.rt?.score100 ?? null,
      metacritic_score: ratings.metacritic?.score100 ?? null,
      tmdb_score: ratings.tmdb?.score10 ?? null,
      raw_data: rest,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("tv_ratings_cache")
      .upsert(payload, { onConflict: "tmdb_id" });
    if (error) {
      console.warn("[tv-cache:write] supabase error:", error.message);
    }
  } catch (err) {
    console.warn("[tv-cache:write] threw:", err);
  }
}

// =============================================================================
// Función central. Ahora con cache forever-style (TTL 7d) igual que movies.
// Letterboxd NO indexa series → siempre null.
// Filmaffinity removida del flow.
// =============================================================================
// React.cache dedupea dentro del mismo request: Billboard y TvRatingsSection
// no duplican fetches.
export const getTvRatings = cache(_getTvRatings);

async function _getTvRatings(tvId: number): Promise<RatingsResponse> {
  // 1) Cache primero
  const cached = await readCache(tvId);
  if (cached) return cached;

  // 2) Cache miss → fetch en vivo
  const errors: string[] = [];
  const result: RatingsResponse = {
    tmdbId: tvId,
    imdb: null,
    rt: null,
    metacritic: null,
    tmdb: null,
    letterboxd: null,
    errors,
  };

  let tvDetails: TmdbTvDetails | null = null;
  try {
    tvDetails = await getTvDetails(tvId);
    result.tmdb = tvToPlatformRating(tvDetails);
  } catch (err) {
    errors.push(`tmdb: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  const imdbId = tvDetails.external_ids?.imdb_id;
  if (!imdbId) {
    errors.push("tmdb-no-imdb-id");
    await writeCache(result); // cacheamos igual para no reintentar OMDb
    return result;
  }

  try {
    const omdb = await getOmdbByImdbId(imdbId);
    if (omdb.Response === "True") {
      const imdbScore = parseImdbRating(omdb.imdbRating);
      const imdbVotes = parseImdbVotes(omdb.imdbVotes);
      const metaScore = parseMetascore(omdb.Metascore);
      const rtScore = findRtScore(omdb.Ratings);

      if (imdbScore !== null) {
        result.imdb = {
          ...rate10(imdbScore),
          votes: imdbVotes ?? undefined,
          url: `https://www.imdb.com/title/${imdbId}/`,
        };
      }
      // Slugs RT/Metacritic usan original_name (inglés) cuando hay,
      // sino el name traducido.
      const slugSource = tvDetails.original_name ?? tvDetails.name;
      if (metaScore !== null) {
        result.metacritic = {
          ...rate100(metaScore),
          url: slugSource
            ? `https://www.metacritic.com/tv/${slugifyDash(slugSource)}`
            : undefined,
        };
      }
      if (rtScore !== null) {
        result.rt = {
          ...rate100(rtScore),
          url: slugSource
            ? `https://www.rottentomatoes.com/tv/${slugifyUnderscore(slugSource)}`
            : undefined,
        };
      }
    } else {
      errors.push(`omdb: ${omdb.Error ?? "not found"}`);
    }
  } catch (err) {
    errors.push(`omdb: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3) Cache
  await writeCache(result);
  return result;
}

function slugifyDash(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
function slugifyUnderscore(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
