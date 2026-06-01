import * as cheerio from "cheerio";

const TIMEOUT_MS = 5000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

// Resultado del scraper. Si algo falla, devolvemos null sin tirar excepción.
export type LetterboxdResult = {
  score10: number; // 0-10
  url: string; // URL del film en Letterboxd
} | null;

// Letterboxd usa slugs en kebab-case del título original en inglés.
// Ej: "The Batman" → "the-batman", "Léon: The Professional" → "leon-the-professional"
function buildSlug(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita diacríticos (é → e)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Estrategia preferida: pegarle a /tmdb/{id}/ que Letterboxd resuelve y
// redirige al slug correcto. Esto arregla el bug donde el slug del título
// coincidía con OTRA peli distinta (ej. "backrooms" en Letterboxd era una
// corta de 2014, no la peli de Kane Parsons de 2026).
//
// Si el redirect por TMDB id falla (peli muy nueva sin entry todavía,
// o Letterboxd cambia el endpoint), caemos al método anterior basado en
// slug del original_title.
export async function getLetterboxdRating(
  tmdbId: number | null | undefined,
  originalTitle: string,
  fallbackTitle?: string
): Promise<LetterboxdResult> {
  // 1) TMDB id resolver (más confiable)
  if (typeof tmdbId === "number" && Number.isFinite(tmdbId) && tmdbId > 0) {
    const result = await tryScrape(`https://letterboxd.com/tmdb/${tmdbId}/`);
    if (result) return result;
  }

  // 2) Fallback por slug del original_title
  const candidates = new Set<string>();
  candidates.add(buildSlug(originalTitle));
  if (fallbackTitle && fallbackTitle !== originalTitle) {
    candidates.add(buildSlug(fallbackTitle));
  }
  for (const slug of candidates) {
    if (!slug) continue;
    const result = await tryScrape(`https://letterboxd.com/film/${slug}/`);
    if (result) return result;
  }
  return null;
}

async function tryScrape(url: string): Promise<LetterboxdResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
      next: { revalidate: 60 * 60 * 24 * 7 }, // 7 días — pero igual lo gobierna Supabase
    });

    if (!res.ok) return null;

    // res.url es la URL final después del redirect (ej. /tmdb/X/ → /film/slug/).
    // La usamos como link canónico para el frontend.
    const finalUrl = res.url || url;
    const html = await res.text();
    const score = extractScore(html);
    if (score === null) return null;
    return { score10: score, url: finalUrl };
  } catch {
    // timeout, abort, network error → null
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Letterboxd pone el rating en dos lugares:
// 1. meta[name="twitter:data2"] content="3.59 out of 5" (en pelis con rating)
// 2. script[type="application/ld+json"] aggregateRating.ratingValue (también /5)
// El valor está en escala 0-5. Multiplicamos por 2 para llevar a 0-10.
function extractScore(html: string): number | null {
  const $ = cheerio.load(html);

  // Estrategia 1: meta twitter:data2
  const twitter = $('meta[name="twitter:data2"]').attr("content");
  if (twitter) {
    const m = twitter.match(/([\d.]+)\s*out of\s*5/i);
    if (m) {
      const v = parseFloat(m[1]);
      if (Number.isFinite(v) && v >= 0 && v <= 5) {
        return Math.round(v * 2 * 10) / 10;
      }
    }
  }

  // Estrategia 2: JSON-LD aggregateRating
  const ldScripts = $('script[type="application/ld+json"]').toArray();
  for (const script of ldScripts) {
    const raw = $(script).contents().text();
    // Letterboxd envuelve el JSON-LD con CDATA y comentarios — limpiamos
    const cleaned = raw
      .replace(/\/\*\s*<!\[CDATA\[\s*\*\//g, "")
      .replace(/\/\*\s*\]\]>\s*\*\//g, "")
      .trim();
    try {
      const json = JSON.parse(cleaned);
      const rating = json?.aggregateRating?.ratingValue;
      if (typeof rating === "number" && rating >= 0 && rating <= 5) {
        return Math.round(rating * 2 * 10) / 10;
      }
      if (typeof rating === "string") {
        const v = parseFloat(rating);
        if (Number.isFinite(v) && v >= 0 && v <= 5) {
          return Math.round(v * 2 * 10) / 10;
        }
      }
    } catch {
      // JSON-LD malformado — seguimos al siguiente script
    }
  }

  return null;
}
