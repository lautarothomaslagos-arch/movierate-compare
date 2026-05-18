import { omdbResponseSchema, type OmdbResponse } from "@/types/movie";

const OMDB_BASE = "https://www.omdbapi.com/";

// Fetch a OMDb por IMDb id (ej "tt1877830"). TMDB nos da ese ID en movie.imdb_id.
// OMDb tiene 1000 requests/día gratis — el caché en Supabase (Paso 6) baja esto a casi 0.
export async function getOmdbByImdbId(imdbId: string): Promise<OmdbResponse> {
  const key = process.env.OMDB_API_KEY;
  if (!key) throw new Error("OMDB_API_KEY no está definida en .env.local");

  const url = new URL(OMDB_BASE);
  url.searchParams.set("apikey", key);
  url.searchParams.set("i", imdbId);
  url.searchParams.set("tomatoes", "true"); // pide ratings de RT en el array Ratings

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 * 60 * 24 }, // OMDb cambia poco — caché server-side 24h
  });

  if (!res.ok) {
    throw new Error(`OMDb ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const json = await res.json();
  return omdbResponseSchema.parse(json);
}

// Helpers de parsing — OMDb manda todo como string.
// Devuelven null si el campo es inválido o "N/A" (lo que OMDb usa para faltantes).

export function parseImdbRating(value: string | undefined): number | null {
  if (!value || value === "N/A") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export function parseImdbVotes(value: string | undefined): number | null {
  if (!value || value === "N/A") return null;
  // OMDb usa "915,712" con coma como separador de miles
  const n = parseInt(value.replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export function parseMetascore(value: string | undefined): number | null {
  if (!value || value === "N/A") return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

// "85%" → 85, "8.5/10" → null (no es RT), etc.
export function parseRtTomatometer(value: string): number | null {
  const m = value.match(/^(\d{1,3})%$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

// Devuelve el valor de RT del array Ratings, o null si no está.
export function findRtScore(
  ratings: Array<{ Source: string; Value: string }> | undefined
): number | null {
  if (!ratings) return null;
  const rt = ratings.find((r) => r.Source === "Rotten Tomatoes");
  if (!rt) return null;
  return parseRtTomatometer(rt.Value);
}
