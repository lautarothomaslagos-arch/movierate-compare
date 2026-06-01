// Fallback de IMDb rating scrapeando JSON-LD de la página oficial.
// =====================================================================
// OMDb tiene delay de días/semanas para indexar pelis nuevas. Cuando una
// peli es muy reciente (ej. Backrooms 2026) IMDb ya tiene rating pero
// OMDb no devuelve nada. Para no perder esa info, scrapeamos JSON-LD
// directamente de la página de IMDb.
//
// JSON-LD: bloque `<script type="application/ld+json">` en el HTML con
// schema.org/Movie. Incluye aggregateRating.ratingValue y ratingCount.
// Es estable porque IMDb lo usa para Google rich snippets.

type ImdbScrapeResult = {
  score10: number;
  votes: number | null;
  url: string;
};

// User-Agent realista para no ser tratado como bot agresivo.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Cache 24h por imdb id — los ratings cambian lentamente y queremos
// minimizar carga a IMDb.
const REVALIDATE_SECONDS = 24 * 60 * 60;

export async function getImdbRatingScraped(
  imdbId: string
): Promise<ImdbScrapeResult | null> {
  // Sanitize: imdbId tiene que matchear "tt" + dígitos
  if (!/^tt\d+$/.test(imdbId)) return null;

  const url = `https://www.imdb.com/title/${imdbId}/`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      return null;
    }

    const html = await res.text();

    // Extraer todos los bloques JSON-LD. IMDb a veces tiene varios.
    const ldRegex =
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = ldRegex.exec(html)) !== null) {
      const json = match[1].trim();
      try {
        const parsed = JSON.parse(json) as unknown;
        const result = extractRating(parsed, url);
        if (result) return result;
      } catch {
        // ignoramos JSON inválido y seguimos con el siguiente
      }
    }

    return null;
  } catch (err) {
    console.warn("[imdb-scrape] failed for", imdbId, err);
    return null;
  }
}

// Busca aggregateRating en el JSON-LD recursivamente. El root puede ser un
// Movie, TVSeries o un @graph array.
function extractRating(
  parsed: unknown,
  url: string
): ImdbScrapeResult | null {
  if (!parsed || typeof parsed !== "object") return null;

  // Caso 1: objeto único con aggregateRating directo
  const obj = parsed as Record<string, unknown>;
  if (
    "aggregateRating" in obj &&
    obj.aggregateRating &&
    typeof obj.aggregateRating === "object"
  ) {
    const ag = obj.aggregateRating as Record<string, unknown>;
    const score = Number(ag.ratingValue);
    const votes = Number(ag.ratingCount);
    if (Number.isFinite(score) && score > 0) {
      return {
        score10: score,
        votes: Number.isFinite(votes) && votes > 0 ? votes : null,
        url,
      };
    }
  }

  // Caso 2: @graph array (estructura de IMDb cuando hay múltiples entities)
  if ("@graph" in obj && Array.isArray(obj["@graph"])) {
    for (const item of obj["@graph"]) {
      const inner = extractRating(item, url);
      if (inner) return inner;
    }
  }

  return null;
}
