// Fallback de IMDb rating cuando OMDb no tiene la peli.
// =====================================================================
// OMDb tiene delay de días/semanas para indexar pelis nuevas. Cuando una
// peli es muy reciente (ej. Backrooms 2026) IMDb ya tiene rating pero
// OMDb no devuelve nada.
//
// IMPORTANTE: scrapear imdb.com directamente NO funciona — IMDb está
// detrás de AWS WAF y devuelve un challenge de JavaScript en vez del
// HTML real. Por eso usamos api.imdbapi.dev, un mirror público gratuito
// que devuelve los datos en JSON directo.
//
// API docs: https://api.imdbapi.dev/  (no requiere API key)
// Estructura de respuesta:
//   {
//     id: "tt26657236",
//     primaryTitle: "Backrooms",
//     rating: { aggregateRating: 7.1, voteCount: 24625 },
//     ...
//   }
//
// Si api.imdbapi.dev se cae, devolvemos null y la peli queda sin rating
// de IMDb hasta que OMDb la indexe. No es crítico.

type ImdbScrapeResult = {
  score10: number;
  votes: number | null;
  url: string;
};

// Cache 24h por imdb id — los ratings cambian lentamente y queremos
// minimizar carga a la API mirror.
const REVALIDATE_SECONDS = 24 * 60 * 60;

type ImdbApiDevResponse = {
  id?: string;
  rating?: {
    aggregateRating?: number;
    voteCount?: number;
  };
};

export async function getImdbRatingScraped(
  imdbId: string
): Promise<ImdbScrapeResult | null> {
  // Sanitize: imdbId tiene que matchear "tt" + dígitos
  if (!/^tt\d+$/.test(imdbId)) return null;

  const apiUrl = `https://api.imdbapi.dev/titles/${imdbId}`;
  // URL pública para el link del usuario (no la API mirror, que es solo data).
  const publicUrl = `https://www.imdb.com/title/${imdbId}/`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      // 404 = peli no existe en IMDb todavía; 5xx = API caída.
      // En ambos casos devolvemos null y seguimos.
      return null;
    }

    const data = (await res.json()) as ImdbApiDevResponse;

    const score = data.rating?.aggregateRating;
    const votes = data.rating?.voteCount;

    if (typeof score !== "number" || !Number.isFinite(score) || score <= 0) {
      return null;
    }

    return {
      score10: score,
      votes:
        typeof votes === "number" && Number.isFinite(votes) && votes > 0
          ? votes
          : null,
      url: publicUrl,
    };
  } catch (err) {
    console.warn("[imdb-fallback] failed for", imdbId, err);
    return null;
  }
}
