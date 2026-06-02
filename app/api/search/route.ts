import { NextResponse, type NextRequest } from "next/server";

import { extractTitleFromNaturalQuery } from "@/lib/ai-search-extract";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { stripStopwords } from "@/lib/search-stopwords";
import { searchMulti } from "@/lib/tmdb";

// Normaliza un query para que sea más tolerante a typos comunes:
// - sin acentos (à → a, é → e, ñ → n)
// - lowercase
// - trim
// - colapsa espacios múltiples
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

// Estrategia de búsqueda en cascada. Cada paso intenta encontrar resultados;
// si encuentra, retorna. Si no, pasa al próximo.
//
// Orden:
//   1. Query original normalizado (1-4 palabras → directo a TMDB)
//   2. Stopwords stripped si tiene 3+ palabras
//   3. Variantes de typo (sin última palabra, sin último char, prefix)
//   4. IA extractor si tiene 5+ palabras (queries descriptivos en lenguaje natural)
//
// Devuelve { results, usedQuery, source } donde source indica qué etapa lo
// resolvió (para mostrar didYouMean apropiado al user).
async function smartSearch(originalNormalized: string): Promise<{
  results: SearchItem[];
  usedQuery: string;
  source: "direct" | "stripped" | "variant" | "ai";
}> {
  // 1. Direct
  const direct = await tmdbSearch(originalNormalized);
  if (direct.length > 0) {
    return { results: direct, usedQuery: originalNormalized, source: "direct" };
  }

  // 2. Stopwords stripped (solo si vale la pena)
  const stripped = stripStopwords(originalNormalized);
  if (stripped !== originalNormalized && stripped.length >= 2) {
    const r = await tmdbSearch(stripped);
    if (r.length > 0) {
      return { results: r, usedQuery: stripped, source: "stripped" };
    }
  }

  // 3. Variantes de typo
  const variants = buildFallbackVariants(originalNormalized);
  for (const v of variants) {
    const r = await tmdbSearch(v);
    if (r.length > 0) {
      return { results: r, usedQuery: v, source: "variant" };
    }
  }

  // 4. IA extractor — solo si el query parece descriptivo (5+ palabras).
  // Es la opción más cara, va al final.
  const wordCount = originalNormalized.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 5) {
    try {
      const ai = await extractTitleFromNaturalQuery(originalNormalized);
      if (ai) {
        // Probar primary
        const r1 = await tmdbSearch(ai.primary.toLowerCase());
        if (r1.length > 0) {
          return { results: r1, usedQuery: ai.primary, source: "ai" };
        }
        // Probar alternativas
        for (const alt of ai.alternatives) {
          const r2 = await tmdbSearch(alt.toLowerCase());
          if (r2.length > 0) {
            return { results: r2, usedQuery: alt, source: "ai" };
          }
        }
      }
    } catch (err) {
      console.warn("[search] ai extract threw:", err);
    }
  }

  return { results: [], usedQuery: originalNormalized, source: "direct" };
}

// GET /api/search?q=batman
// Devuelve { results, query, didYouMean }:
// - results: array de pelis/series/personas (max 10)
// - query: el query efectivo usado (puede ser distinto al original)
// - didYouMean: el query usado SI fue distinto al original, sino null
export async function GET(request: NextRequest) {
  // Rate limit por IP: 60 req/min en search
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
    const { results, usedQuery, source } = await smartSearch(normalized);

    // didYouMean solo si llegamos al resultado por una vía que NO fue
    // "direct" — así le decimos al user "buscamos X en lugar de Y".
    const didYouMean =
      results.length > 0 && source !== "direct" ? usedQuery : null;

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
