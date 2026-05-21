import { getTvDetails } from "@/lib/tmdb";
import {
  findRtScore,
  getOmdbByImdbId,
  parseImdbRating,
  parseImdbVotes,
  parseMetascore,
} from "@/lib/omdb";
import type {
  PlatformRating,
  RatingsResponse,
  TmdbTvDetails,
} from "@/types/movie";

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

// Series: ratings TMDB + OMDb (IMDb/RT/Metacritic).
// Letterboxd NO indexa series → siempre null.
// Filmaffinity está bloqueada por Cloudflare → siempre null.
//
// Por ahora NO cacheamos en Supabase (la tabla `ratings_cache` usa
// tmdb_id como PK y movies/tv comparten espacio de IDs en distintos
// namespaces — necesitaríamos una migration). Cada visita hace fetch.
// Cuando crezca la app metemos cache.
export async function getTvRatings(tvId: number): Promise<RatingsResponse> {
  const errors: string[] = [];
  const result: RatingsResponse = {
    tmdbId: tvId,
    imdb: null,
    rt: null,
    metacritic: null,
    tmdb: null,
    letterboxd: null, // no indexa series
    // filmaffinity removida
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
      if (metaScore !== null) {
        result.metacritic = {
          ...rate100(metaScore),
          url: tvDetails.name
            ? `https://www.metacritic.com/tv/${slugifyDash(tvDetails.name)}`
            : undefined,
        };
      }
      if (rtScore !== null) {
        result.rt = {
          ...rate100(rtScore),
          url: tvDetails.name
            ? `https://www.rottentomatoes.com/tv/${slugifyUnderscore(tvDetails.name)}`
            : undefined,
        };
      }
    } else {
      errors.push(`omdb: ${omdb.Error ?? "not found"}`);
    }
  } catch (err) {
    errors.push(`omdb: ${err instanceof Error ? err.message : String(err)}`);
  }

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
