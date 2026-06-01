// Fallback de Rotten Tomatoes scraping cuando OMDb no tiene el score.
// =====================================================================
// OMDb devuelve el Tomatometer en su array `Ratings[]` cuando lo tiene,
// pero hay delay de días/semanas para pelis nuevas. Para esos casos
// scrapeamos directamente la página de RT que expone el Tomatometer en
// JSON-LD (schema.org/Movie con aggregateRating).
//
// Ventaja: RT NO está protegida por WAF (a diferencia de imdb.com).
// Funciona con un User-Agent realista de browser.
//
// Estructura del JSON-LD:
//   "aggregateRating": {
//     "@type": "AggregateRating",
//     "name": "Tomatometer",
//     "ratingValue": "90",
//     "bestRating": "100",
//     "ratingCount": 192
//   }

type RtScrapeResult = {
  score100: number; // Tomatometer 0-100
  url: string;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";
const REVALIDATE_SECONDS = 24 * 60 * 60;
const TIMEOUT_MS = 5000;

// mediaType: "m" para movies (/m/{slug}), "tv" para series (/tv/{slug}).
// slug: lo arman ratings.ts / tv-ratings.ts con underscore_case del original_title.
export async function getRtScoreScraped(
  slug: string,
  mediaType: "m" | "tv" = "m"
): Promise<RtScrapeResult | null> {
  if (!slug) return null;
  const url = `https://www.rottentomatoes.com/${mediaType}/${slug}`;
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
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Buscar bloques JSON-LD. RT a veces tiene varios; nos quedamos con
    // el primero que tenga aggregateRating con name "Tomatometer".
    const ldRegex =
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = ldRegex.exec(html)) !== null) {
      const json = match[1].trim();
      try {
        const parsed = JSON.parse(json) as Record<string, unknown>;
        const ag = parsed.aggregateRating as
          | Record<string, unknown>
          | undefined;
        if (!ag) continue;

        // Validamos que sea Tomatometer (no Audience). bestRating debería
        // ser 100 (escala porcentual de críticos).
        const name = typeof ag.name === "string" ? ag.name : "";
        const best = Number(ag.bestRating);
        const score = Number(ag.ratingValue);

        if (
          (name === "Tomatometer" || best === 100) &&
          Number.isFinite(score) &&
          score >= 0 &&
          score <= 100
        ) {
          return { score100: Math.round(score), url };
        }
      } catch {
        // JSON inválido — seguimos al siguiente script
      }
    }

    return null;
  } catch (err) {
    console.warn("[rt-scrape] failed for", slug, err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
