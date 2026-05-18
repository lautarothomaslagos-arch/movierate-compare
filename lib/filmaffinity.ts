import * as cheerio from "cheerio";

const TIMEOUT_MS = 5000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";
const COMMON_HEADERS = {
  "User-Agent": UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "Cache-Control": "max-age=0",
};

export type FilmaffinityResult = {
  score10: number; // 0-10
  url: string;
} | null;

// Estrategia:
// 1. Buscar en /es/search.php?stext=<title> (filtramos por año en el HTML)
// 2. Tomar el primer resultado que matchee año (±1 por discrepancias de estreno)
// 3. Ir a su URL de detalle y extraer el rating
//
// Filmaffinity bloquea bots con User-Agent genéricos. Le pasamos un UA real
// de Chrome. Si igual nos bloquean (403, 429, captcha), devolvemos null.
export async function getFilmaffinityRating(
  title: string,
  year: number | null
): Promise<FilmaffinityResult> {
  try {
    const searchUrl = `https://www.filmaffinity.com/es/search.php?stext=${encodeURIComponent(
      title
    )}`;
    const html = await fetchWithTimeout(searchUrl);
    if (!html) return null;

    const filmUrl = pickBestMatch(html, year);
    if (!filmUrl) return null;

    const filmHtml = await fetchWithTimeout(filmUrl);
    if (!filmHtml) return null;

    const score = extractScore(filmHtml);
    if (score === null) return null;

    return { score10: score, url: filmUrl };
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: COMMON_HEADERS,
      signal: controller.signal,
      next: { revalidate: 60 * 60 * 24 * 7 },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// La página de búsqueda puede:
// - Devolver una lista de resultados → buscamos el primero que matchee año
// - Redirigir directo al film si hay un solo match (en ese caso la URL ya
//   contiene el rating; pero el response.url no nos llega acá fácil)
//
// El HTML de búsqueda incluye cards con `.movie-card-1` o links a /es/film*.html.
function pickBestMatch(html: string, year: number | null): string | null {
  const $ = cheerio.load(html);

  type Candidate = { url: string; year: number | null };
  const candidates: Candidate[] = [];

  // Resultados típicos: divs con clases tipo "se-it" o "movie-card-1"
  $("a[href*='/film']").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    // Solo links a /es/filmNNNNNN.html (URLs canónicas de film)
    const m = href.match(/\/es\/film\d+\.html/);
    if (!m) return;

    // Buscamos el año cerca: el card padre usualmente tiene un span con (YYYY)
    const card = $(el).closest(".se-it, .movie-card, .movie-card-1, li");
    const cardText = card.text();
    const ym = cardText.match(/\b(19|20)\d{2}\b/);
    const candidateYear = ym ? parseInt(ym[0], 10) : null;

    const fullUrl = href.startsWith("http")
      ? href
      : `https://www.filmaffinity.com${href}`;

    candidates.push({ url: fullUrl, year: candidateYear });
  });

  if (candidates.length === 0) {
    // ¿Está la página directamente en el detalle? Por la redirección
    // de FilmAffinity, eso es posible. Si la página tiene un rating
    // sólido y un canonical hacia un film, lo usamos.
    const canonical = $('link[rel="canonical"]').attr("href");
    if (canonical && /\/es\/film\d+\.html/.test(canonical)) {
      return canonical;
    }
    return null;
  }

  if (year !== null) {
    const exact = candidates.find((c) => c.year === year);
    if (exact) return exact.url;
    const close = candidates.find(
      (c) => c.year !== null && Math.abs(c.year - year) <= 1
    );
    if (close) return close.url;
  }

  // Sin info de año → primero de la lista
  return candidates[0].url;
}

// La página de un film tiene el rating en #movie-rat-avg o similar.
// Filmaffinity usa coma como separador decimal en español ("7,8").
function extractScore(html: string): number | null {
  const $ = cheerio.load(html);

  // El rating está en un elemento con id="movie-rat-avg" o en una clase
  // tipo "avgrat-box". Probamos ambos.
  const candidates = [
    $("#movie-rat-avg").text(),
    $(".avgrat-box").text(),
    $('[itemprop="ratingValue"]').attr("content"),
    $('[itemprop="ratingValue"]').text(),
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "");
    if (!cleaned) continue;
    const v = parseFloat(cleaned);
    if (Number.isFinite(v) && v >= 0 && v <= 10) {
      return Math.round(v * 10) / 10;
    }
  }

  return null;
}
