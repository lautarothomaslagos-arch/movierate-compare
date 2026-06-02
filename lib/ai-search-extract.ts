import { GoogleGenAI } from "@google/genai";

// Extractor de títulos para queries naturales largos. Cuando el user
// tipea algo descriptivo ("la peli del tipo que vive un mismo día una y
// otra vez", "esa serie alemana de un chico que viaja en el tiempo"),
// Gemini Flash intenta identificar el título probable y nos devuelve
// alternativas para que el buscador las pruebe en cascada.
//
// Performance: cache LRU in-memory para queries vistos antes en el
// mismo runtime del server. Cuando una conexión Vercel pega un cold
// start se pierde, pero durante un mismo deploy ahorra llamadas.
//
// Costos: Gemini Flash es barato pero NO gratis. Por eso solo lo
// llamamos para queries que parecen descriptivos (5+ palabras tras
// limpiar). Queries cortos ya andan bien con TMDB + stopwords.

export type SearchExtractResult = {
  primary: string;
  alternatives: string[];
};

const CACHE_MAX = 200;
const cache = new Map<string, SearchExtractResult>();

function cacheGet(key: string): SearchExtractResult | undefined {
  const v = cache.get(key);
  if (!v) return undefined;
  // LRU: re-inserta para ponerlo "fresco" al final.
  cache.delete(key);
  cache.set(key, v);
  return v;
}

function cacheSet(key: string, val: SearchExtractResult): void {
  if (cache.size >= CACHE_MAX) {
    // Borrar el más viejo (primero del Map iteration order)
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  cache.set(key, val);
}

let _client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY no está definida en .env.local");
    }
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

function buildPrompt(query: string): string {
  return `Sos un asistente de búsqueda de películas y series. El usuario describió un título en lenguaje natural (puede ser en español argentino). Identificá el título MÁS PROBABLE al que se refiere, y 2 alternativas si dudás.

CONSULTA: "${query}"

Reglas:
- Devolvé el título tal como aparece en TMDB/IMDb (en idioma original, NO traducciones latinoamericanas).
- Si la descripción es ambigua, las 2 alternativas son títulos diferentes que también podría ser.
- Si NO podés identificar nada con razonable seguridad, devolvé primary vacío "".
- Mantenelo breve. No expliques nada.

Ejemplos de cómo pensar:
- "la del tipo que vive un mismo día" → primary: "Groundhog Day", alternatives: ["Edge of Tomorrow", "Palm Springs"]
- "esa peli alemana del chico que viaja en el tiempo" → primary: "Dark", alternatives: ["The Tunnel", "Run Lola Run"]
- "la del padrino" → primary: "The Godfather", alternatives: []
- "una de zombies coreana en un tren" → primary: "Train to Busan", alternatives: []
- "la peli con Brad Pitt donde envejece al revés" → primary: "The Curious Case of Benjamin Button", alternatives: []

Respondé SOLO con este JSON (sin markdown, sin texto extra):
{"primary":"Título","alternatives":["Alt 1","Alt 2"]}`;
}

function safeParse(raw: string): SearchExtractResult | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    cleaned = cleaned.trim();
  }
  if (!cleaned.startsWith("{")) {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last > first) {
      cleaned = cleaned.slice(first, last + 1);
    }
  }
  try {
    const parsed = JSON.parse(cleaned) as {
      primary?: unknown;
      alternatives?: unknown;
    };
    const primary =
      typeof parsed.primary === "string" ? parsed.primary.trim() : "";
    if (!primary) return null;
    const alternatives = Array.isArray(parsed.alternatives)
      ? parsed.alternatives
          .filter((x): x is string => typeof x === "string")
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 3)
      : [];
    return { primary, alternatives };
  } catch {
    return null;
  }
}

// Extrae el título más probable de un query descriptivo natural.
// Devuelve null si el query es muy corto, si Gemini falla o si no puede
// identificar nada con razonable seguridad.
export async function extractTitleFromNaturalQuery(
  query: string
): Promise<SearchExtractResult | null> {
  const trimmed = query.trim();

  // No vale la pena llamar a Gemini para queries cortos
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount < 5) return null;
  if (trimmed.length > 200) return null; // safety cap

  const key = trimmed.toLowerCase();
  const cached = cacheGet(key);
  if (cached !== undefined) {
    console.log("[ai-search-extract] cache hit:", trimmed.slice(0, 60));
    return cached;
  }

  try {
    const client = getClient();
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: buildPrompt(trimmed),
      config: {
        temperature: 0.3,
        maxOutputTokens: 500,
        thinkingConfig: { thinkingBudget: 256 },
      },
    });
    const text = response.text?.trim() ?? "";
    if (!text) return null;

    const result = safeParse(text);
    if (result) {
      cacheSet(key, result);
      console.log(
        `[ai-search-extract] "${trimmed.slice(0, 50)}" → "${result.primary}"`
      );
    } else {
      console.warn(
        "[ai-search-extract] parse failed for:",
        trimmed.slice(0, 80)
      );
    }
    return result;
  } catch (err) {
    console.warn("[ai-search-extract] gemini call failed:", err);
    return null;
  }
}
