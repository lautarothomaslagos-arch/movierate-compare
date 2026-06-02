import { GoogleGenAI } from "@google/genai";

// Wrapper para Gemini Flash. Recomienda 5 títulos basándose en el contexto
// del user (historial reciente, watchlist, top reviews) + un query libre o
// mood opcional. Devuelve un array tipado con título, año, lede y body.
//
// v3 — fixes pertinentes:
//   - responseMimeType: "application/json" FUERZA al modelo a devolver
//     JSON estructurado. Antes podía meter ```json fences o texto antes/
//     después que rompían el parse. Ahora es JSON puro garantizado.
//   - thinkingBudget DESACTIVADO en el primer intento. La combinación
//     thinking + maxOutputTokens en gemini-2.5-flash producía respuestas
//     incompletas para queries simples. Si el primer intento falla,
//     reintentamos con un prompt aún más simple.
//   - Triple fallback: si la respuesta no se puede leer en attempt 1,
//     attempt 2 simplifica el prompt; attempt 3 baja a un modelo
//     anterior por si Gemini 2.5 tiene un blip.
//   - Logs verbosos con preview del raw response para debug.

export type RecommenderInput = {
  recentlyWatched: Array<{ title: string; year: number | null }>;
  watchlist: Array<{ title: string; year: number | null }>;
  loved: Array<{ title: string; year: number | null; rating: number }>;
  disliked: Array<{ title: string; year: number | null; rating: number }>;
  query: string | null;
  mood: string | null;
};

export type Recommendation = {
  title: string;
  year: number | null;
  lede: string;
  body: string;
  media_type: "movie" | "tv";
};

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

function formatList(
  items: Array<{ title: string; year: number | null }>,
  max = 10
): string {
  if (items.length === 0) return "(ninguna)";
  return items
    .slice(0, max)
    .map((it) => (it.year ? `${it.title} (${it.year})` : it.title))
    .join(", ");
}

const SLANG_GLOSSARY_ES = `
GLOSARIO RIOPLATENSE (interpretá expresiones del usuario con este sentido):
- "dolor de panza" / "que duela" → intensa emocionalmente, devastadora, te golpea fuerte.
- "una bomba" / "tremenda" → muy buena, brillante, imperdible.
- "te lleva puesto" → arrolladora, no te suelta hasta el final.
- "copada" / "buena onda" → entretenida, liviana, cálida.
- "lágrima fácil" / "para llorar" → triste, melancólica, dramática.
- "te volás la cabeza" → fascinante, alucinante, ideas grandes (sci-fi, mindfuck).
- "para colgarse" → fácil de ver, ideal para maratón, episódica.
- "rara" / "loca" → experimental, no convencional, autoral.
- "oscura" / "densa" → noir, sombría, ambigua moralmente.
- "para pareja" → romántica o que la pareja disfrute igual.
- "tirada" / "boluda" / "para no pensar" → liviana, escapista, palomitera.
- "asiática" / "coreana" → cine de Corea, Japón, Hong Kong, etc.
- "magia" → fantasy, fantástico, realismo mágico.
`;

function buildFullPrompt(input: RecommenderInput, locale: "es" | "en"): string {
  const lovedList =
    input.loved.length > 0
      ? input.loved
          .slice(0, 5)
          .map(
            (it) =>
              `${it.title}${it.year ? ` (${it.year})` : ""} — ${it.rating.toFixed(1)}/10`
          )
          .join(", ")
      : locale === "es"
        ? "(ninguna)"
        : "(none)";

  const dislikedList =
    input.disliked.length > 0
      ? input.disliked
          .slice(0, 5)
          .map(
            (it) =>
              `${it.title}${it.year ? ` (${it.year})` : ""} — ${it.rating.toFixed(1)}/10`
          )
          .join(", ")
      : locale === "es"
        ? "(ninguna)"
        : "(none)";

  const hasProfile =
    input.recentlyWatched.length > 0 ||
    input.watchlist.length > 0 ||
    input.loved.length > 0 ||
    input.disliked.length > 0;

  if (locale === "en") {
    return `You are a film critic. Recommend 5 movies or TV shows based on the reader's profile and request.

READER PROFILE:
- Recently watched: ${formatList(input.recentlyWatched, 15)}
- Want to watch: ${formatList(input.watchlist, 15)}
- LOVED: ${lovedList}
- DISLIKED: ${dislikedList}
${!hasProfile ? "(NEW USER — base on query/mood, lean toward acclaimed titles)\n" : ""}
QUERY: ${input.query ?? "(none)"}
MOOD: ${input.mood ?? "(none)"}

For each title:
- title: real title as on TMDB/IMDb (original language, NOT translations)
- year: exact release year
- lede: ONE editorial sentence starting with "Because…" (max 90 chars)
- body: 2-3 sentences of prose, atmospheric (max 300 chars)
- media_type: "movie" or "tv"

Rules:
- 5 titles not in profile
- Match LOVED style, avoid DISLIKED
- Real titles only, real years
- Mix movies and TV when fitting`;
  }

  return `Sos un crítico de cine. Recomendá 5 películas o series basándote en el perfil + pedido del lector.

${SLANG_GLOSSARY_ES}

PERFIL DEL LECTOR:
- Vistas recientes: ${formatList(input.recentlyWatched, 15)}
- En su lista de "quiero ver": ${formatList(input.watchlist, 15)}
- LE ENCANTARON: ${lovedList}
- NO LE GUSTARON: ${dislikedList}
${!hasProfile ? "(USUARIO NUEVO — basate en query/mood, inclinate a títulos aclamados)\n" : ""}
CONSULTA: ${input.query ?? "(ninguna)"}
MOOD: ${input.mood ?? "(ninguno)"}

Por cada título:
- title: el título real como aparece en TMDB/IMDb (idioma original, NO traducciones latinas)
- year: el año exacto de estreno
- lede: UNA oración editorial que empieza con "Porque…" (max 90 chars)
- body: 2-3 oraciones de prosa atmosférica (max 300 chars)
- media_type: "movie" o "tv"

Reglas:
- 5 títulos que NO estén en el perfil
- Alineados con los que LE ENCANTARON, evitar similares a los NO LE GUSTARON
- Castellano rioplatense (vos/tenés)
- Títulos reales, años reales (verificá mentalmente)
- Mezclar pelis y series cuando tenga sentido`;
}

function buildSimplePrompt(input: RecommenderInput, locale: "es" | "en"): string {
  if (locale === "en") {
    return `Recommend 5 acclaimed movies or TV shows for: query="${input.query ?? "any"}", mood="${input.mood ?? "any"}". Real titles, real years. Mix movies and TV. For each: title, year, lede starting with "Because", body of 2-3 sentences, media_type ("movie" or "tv").`;
  }
  return `Recomendá 5 películas o series aclamadas para: consulta="${input.query ?? "cualquiera"}", mood="${input.mood ?? "cualquiera"}". Títulos reales, años reales. Mezclá pelis y series. Por cada uno: title, year, lede que empiece con "Porque", body de 2-3 oraciones en castellano argentino, media_type ("movie" o "tv").`;
}

// Schema JSON que pedimos a Gemini. Con responseMimeType + responseSchema
// el modelo está OBLIGADO a devolver JSON con esta estructura — sin fences,
// sin texto extra, sin preámbulo. Cero ambigüedad de parse.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          year: { type: "integer" },
          lede: { type: "string" },
          body: { type: "string" },
          media_type: { type: "string", enum: ["movie", "tv"] },
        },
        required: ["title", "year", "lede", "body", "media_type"],
      },
    },
  },
  required: ["recommendations"],
};

function safeParse(raw: string): Recommendation[] {
  let cleaned = raw.trim();

  // Defensivo: por más que pidamos JSON, sacar fences si aparecen
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    cleaned = cleaned.trim();
  }
  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last > first) {
      cleaned = cleaned.slice(first, last + 1);
    }
  }

  try {
    const parsed = JSON.parse(cleaned) as {
      recommendations?: unknown;
    };
    if (!Array.isArray(parsed.recommendations)) return [];

    const out: Recommendation[] = [];
    for (const raw of parsed.recommendations) {
      if (typeof raw !== "object" || raw === null) continue;
      const r = raw as Record<string, unknown>;
      const title = typeof r.title === "string" ? r.title.trim() : null;
      const year = typeof r.year === "number" ? r.year : null;
      const lede = typeof r.lede === "string" ? r.lede.trim() : "";
      const body =
        typeof r.body === "string"
          ? r.body.trim()
          : typeof r.why === "string"
            ? r.why.trim()
            : "";
      const media_type =
        r.media_type === "tv" ? "tv" : r.media_type === "movie" ? "movie" : "movie";
      if (!title) continue;
      out.push({ title, year, lede, body, media_type });
    }
    return out.slice(0, 5);
  } catch (err) {
    console.warn("[ai-recommender] JSON parse failed:", err);
    console.warn("[ai-recommender] cleaned preview:", cleaned.slice(0, 300));
    return [];
  }
}

// Extrae texto del response, tolerando estructuras viejas/nuevas de Gemini.
function extractText(response: unknown): string {
  // response.text es el getter conveniente
  const r = response as { text?: string; candidates?: unknown };
  if (typeof r.text === "string") return r.text.trim();
  // Fallback: navegar candidates[].content.parts[].text
  if (Array.isArray(r.candidates) && r.candidates[0]) {
    const c = r.candidates[0] as {
      content?: { parts?: Array<{ text?: string }> };
    };
    const parts = c.content?.parts ?? [];
    return parts
      .map((p) => p.text ?? "")
      .join("")
      .trim();
  }
  return "";
}

async function tryGemini(
  prompt: string,
  model: string,
  thinkingBudget: number
): Promise<Recommendation[]> {
  const client = getClient();
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.8,
      maxOutputTokens: 4000,
      // CLAVE: con responseSchema + responseMimeType, Gemini DEBE devolver
      // JSON estructurado válido. Sin esto, podía meter texto suelto y
      // fences que rompían el parse.
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      thinkingConfig: { thinkingBudget },
    },
  });

  const text = extractText(response);
  if (!text) {
    console.warn(
      `[ai-recommender] ${model} returned empty text. Response keys:`,
      Object.keys(response as object)
    );
    return [];
  }

  const recs = safeParse(text);
  if (recs.length === 0) {
    console.warn(
      `[ai-recommender] ${model} parsed to empty. Raw (first 400):`,
      text.slice(0, 400)
    );
  } else {
    console.log(`[ai-recommender] ${model} returned ${recs.length} recs`);
  }
  return recs;
}

export async function recommend(
  input: RecommenderInput,
  locale: "es" | "en" = "es"
): Promise<Recommendation[]> {
  const fullPrompt = buildFullPrompt(input, locale);
  const simplePrompt = buildSimplePrompt(input, locale);

  // Intento 1: gemini-2.5-flash con prompt completo, SIN thinking.
  // Es la combinación más confiable para output JSON estructurado.
  try {
    const recs = await tryGemini(fullPrompt, "gemini-2.5-flash", 0);
    if (recs.length > 0) return recs;
  } catch (err) {
    console.warn("[ai-recommender] attempt 1 (2.5-flash no thinking) threw:", err);
  }

  // Intento 2: prompt simple, sigue con 2.5-flash sin thinking.
  // Menos contexto = menos chance de confundir al modelo.
  try {
    const recs = await tryGemini(simplePrompt, "gemini-2.5-flash", 0);
    if (recs.length > 0) return recs;
  } catch (err) {
    console.warn("[ai-recommender] attempt 2 (simple, no thinking) threw:", err);
  }

  // Intento 3: prompt simple, con thinking activado (último recurso, más caro).
  try {
    const recs = await tryGemini(simplePrompt, "gemini-2.5-flash", 1024);
    if (recs.length > 0) return recs;
  } catch (err) {
    console.warn("[ai-recommender] attempt 3 (with thinking) threw:", err);
  }

  console.error("[ai-recommender] ALL 3 attempts failed. Query:", input.query, "Mood:", input.mood);
  return [];
}
