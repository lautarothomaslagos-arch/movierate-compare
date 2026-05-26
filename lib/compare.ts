import {
  getMovieDetails,
  getTvDetails,
  getYear,
  posterUrl,
} from "@/lib/tmdb";
import { getRatings } from "@/lib/ratings";
import { getTvRatings } from "@/lib/tv-ratings";
import type { RatingsResponse } from "@/types/movie";

// Formato compacto de "tipo:id" para URLs de comparación.
// Ej: "movie:414906" o "tv:1396"
export type CompareKey = `movie:${number}` | `tv:${number}`;

export function parseCompareKey(input: string | undefined | null): {
  mediaType: "movie" | "tv";
  id: number;
} | null {
  if (!input) return null;
  const m = input.match(/^(movie|tv):(\d+)$/);
  if (!m) return null;
  const id = parseInt(m[2], 10);
  if (!Number.isFinite(id)) return null;
  return { mediaType: m[1] as "movie" | "tv", id };
}

export type ComparableItem = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  originalTitle: string | null;
  year: number | null;
  poster: string | null;
  overview: string | null;
  genres: { id: number; name: string }[];
  director: string | null;
  ratings: RatingsResponse;
};

// Fetch unificado: dado un (mediaType, id), devuelve la data normalizada
// + ratings. Si falla algo crítico tira excepción.
export async function fetchComparable(
  mediaType: "movie" | "tv",
  id: number
): Promise<ComparableItem> {
  if (mediaType === "movie") {
    const [movie, ratings] = await Promise.all([
      getMovieDetails(id),
      getRatings(id),
    ]);
    const director = movie.credits?.crew?.find((c) => c.job === "Director")
      ?.name ?? null;
    return {
      id: movie.id,
      mediaType: "movie",
      title: movie.title,
      originalTitle:
        movie.original_title !== movie.title
          ? movie.original_title ?? null
          : null,
      year: getYear(movie.release_date),
      poster: posterUrl(movie.poster_path, "w500"),
      overview: movie.overview ?? null,
      genres: movie.genres ?? [],
      director,
      ratings,
    };
  }
  const [tv, ratings] = await Promise.all([
    getTvDetails(id),
    getTvRatings(id),
  ]);
  return {
    id: tv.id,
    mediaType: "tv",
    title: tv.name,
    originalTitle:
      tv.original_name !== tv.name ? tv.original_name ?? null : null,
    year: getYear(tv.first_air_date),
    poster: posterUrl(tv.poster_path, "w500"),
    overview: tv.overview ?? null,
    genres: tv.genres ?? [],
    director: tv.created_by?.[0]?.name ?? null,
    ratings,
  };
}
