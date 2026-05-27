import { NextResponse, type NextRequest } from "next/server";

import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { searchMulti } from "@/lib/tmdb";

// Normaliza un query para que sea más tolerante a typos comunes:
// - sin acentos (à → a, é → e, ñ → n)
// - lowercase
// - trim
// - colapsa espacios múltiples
// Devolvemos el normalizado para enviar a TMDB pero conservamos el original
// para mostrar al user si hay sugerencia.
function normalizeQuery(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacríticos
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Genera variantes del query como fallback si el original no devuelve nada:
// - sin la última palabra (típico de typos al final: "harry potte" → "harry")
// - sin el último caracter (typo en última letra)
// - prefix de 4 chars (último recurso para typos brutales)
function buildFallbackVariants(query: string): string[] {
  const out: string[] = [];
  const words = query.split(" ").filter(Boolean);
  if (words.length > 1) {
    out.push(words.slice(0, -1).join(" "));
  }
  if (query.length > 4) {
    out.push(query.slice(0, -1));
  }
  if (query.length > 5) {
    out.push(query.slice(0, Math.min(query.length, query.length - 2)));
  }
  // Dedup
  return Array.from(new Set(out)).filter((v) => v.length >= 2);
}

type SearchItem =
  | {
      id: number;
      media_type: "movie" | "tv";
      title: string;
      year: number | null;
      poster_path: string | null;
    }
  | {
      id: number;
      media_type: "person";
      title: string;
      profile_path: string | null;
    };

async function tmdbSearch(query: string): Promise<SearchItem[]> {
  const data = await searchMulti(query);
  return data.results
    .slice(0, 12)
    .map<SearchItem | null>((item) => {
      if (item.media_type === "movie") {
        return {
          id: item.id,
          media_type: "movie",
          title: item.title,
          year: item.release_date
            ? parseInt(item.release_date.slice(0, 4), 10)
            : null,
          poster_path: item.poster_path ?? null,
        };
      }
      if (item.media_type === "tv") {
        return {
          id: item.id,
          media_type: "tv",
          title: item.name,
          year: item.first_air_date
            ? parseInt(item.first_air_date.slice(0, 4), 10)
            : null,
          poster_path: item.poster_path ?? null,
        };
      }
      if (item.media_type === "person") {
        return {
          id: item.id,
          media_type: "person",
          title: item.name,
          profile_path: item.profile_path ?? null,
        };
      }
      return null;
    })
    .filter((x): x is SearchItem => x !== null)
    .slice(0, 10);
}

// GET /api/search?q=batman
// Devuelve { results, query, didYouMean }:
// - results: array de pelis/series (max 8)
// - query: el query efectivo usado (puede ser distinto al original)
// - didYouMean: el query usado SI fue distinto al original, sino null
export async function GET(request: NextRequest) {
  // Rate limit por IP: 60 req/min en search (es la API más usada)
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`search:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limit", results: [], query: "", didYouMean: null },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      }
    );
  }

  const original = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (original.length < 2) {
    return NextResponse.json({ results: [], query: original, didYouMean: null });
  }

  const normalized = normalizeQuery(original);

  try {
    // Intento 1: query normalizado
    let results = await tmdbSearch(normalized);
    let usedQuery = normalized;

    // Intento 2: si vacío, fallback con variantes
    if (results.length === 0) {
      const variants = buildFallbackVariants(normalized);
      for (const variant of variants) {
        const fallback = await tmdbSearch(variant);
        if (fallback.length > 0) {
          results = fallback;
          usedQuery = variant;
          break;
        }
      }
    }

    // Si el usedQuery es distinto al original normalizado, sugerimos
    const didYouMean =
      results.length > 0 && usedQuery !== normalized ? usedQuery : null;

    return NextResponse.json({
      results,
      query: usedQuery,
      didYouMean,
    });
  } catch (err) {
    console.error("[/api/search] error:", err);
    return NextResponse.json(
      { error: "search_failed", results: [], query: original, didYouMean: null },
      { status: 500 }
    );
  }
}
