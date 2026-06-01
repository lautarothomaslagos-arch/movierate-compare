// Fallback de Metacritic scraping cuando OMDb no tiene el Metascore.
// =====================================================================
// OMDb devuelve `Metascore` en su response cuando lo tiene, pero hay
// delay para pelis nuevas. Scrapeamos directamente la página de Metacritic
// buscando el Metascore en el HTML.
//
// Encontré dos lugares confiables donde está el score:
//   1. aria-label="Metascore 77 out of 100"  (más estable, viene del DOM accesible)
//   2. "ratingValue":77  (en data inline / JSON-LD)
//
// La URL debe terminar en "/" — sin trailing slash devuelve 301 redirect.

type MetacriticScrapeResult = {
  score100: number; // Metascore 0-100
  url: string;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";
const REVALIDATE_SECONDS = 24 * 60 * 60;
const TIMEOUT_MS = 5000;

// mediaType: "movie" o "tv". slug en kebab-case (dashes).
export async function getMetacriticScoreScraped(
  slug: string,
  mediaType: "movie" | "tv" = "movie"
): Promise<MetacriticScrapeResult | null> {
  if (!slug) return null;
  // Trailing slash importante.
  const url = `https://www.metacritic.com/${mediaType}/${slug}/`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Estrategia 1: aria-label del DOM (más confiable).
    const ariaMatch = html.match(/aria-label="Metascore (\d+) out of 100"/);
    if (ariaMatch) {
      const score = Number(ariaMatch[1]);
      if (Number.isFinite(score) && score >= 0 && score <= 100) {
        return { score100: score, url };
      }
    }

    // Estrategia 2: JSON-LD aggregateRating.ratingValue
    const ldRegex =
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    while ((match = ldRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim()) as Record<string, unknown>;
        const ag = parsed.aggregateRating as
          | Record<string, unknown>
          | undefined;
        if (!ag) continue;
        const score = Number(ag.ratingValue);
        const best = Number(ag.bestRating);
        // Metacritic usa bestRating=100 (escala 0-100).
        if (
          Number.isFinite(score) &&
          score >= 0 &&
          score <= 100 &&
          (best === 100 || !Number.isFinite(best))
        ) {
          return { score100: Math.round(score), url };
        }
      } catch {
        // skip
      }
    }

    return null;
  } catch (err) {
    console.warn("[metacritic-scrape] failed for", slug, err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
