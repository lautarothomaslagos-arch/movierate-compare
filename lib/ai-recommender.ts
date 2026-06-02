import { GoogleGenAI } from "@google/genai";

// Wrapper para Gemini Flash. Recomienda 5 títulos basándose en el contexto
// del user (historial reciente, watchlist, top reviews) + un query libre o
// mood opcional. Devuelve un array tipado con título, año, lede y body.
//
// Es responsabilidad del caller resolver los IDs reales en TMDB (vía
// /search/multi) — la IA solo escupe títulos + años, no IDs.
//
// Mejoras de calidad (v2):
//   - maxOutputTokens 1500 → 4000 (el anterior truncaba JSONs largos)
//   - thinkingBudget 0 → 1024 (mejor razonamiento para queries poéticas)
//   - Prompt entiende slang rioplatense ("dolor de panza", "una bomba",
//     "te lleva puesto", etc.) — antes interpretaba literal y fallaba.
//   - Retry automático con prompt simplificado si la primera tanda
//     devuelve [] (JSON corrupto o respuesta vacía).
//   - Maneja perfil vacío: si no tenés historial/reviews, igual recomienda
//     basándose en query+mood, no devuelve nada.

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

// Glosario de slang rioplatense para que Gemini interprete bien los queries.
// Incluido directo en el prompt para que el modelo lo use sin ambigüedad.
const SLANG_GLOSSARY_ES = `
GLOSARIO RIOPLATENSE (interpretá expresiones del usuario con este sentido):
- "dolor de panza" / "que duela" → intensa emocionalmente, devastadora, te golpea fuerte.
- "una bomba" / "un golazo" / "tremenda" → muy buena, brillante, imperdible.
- "te lleva puesto" → arrolladora, no te suelta hasta el final.
- "copada" / "buena onda" → entretenida, liviana, cálida.
- "lágrima fácil" / "para llorar" → triste, melancólica, dramática.
- "te volás la cabeza" → fascinante, alucinante, ideas grandes (sci-fi, mindfuck).
- "para colgarse" → fácil de ver, ideal para maratón, episódica.
- "rara" / "loca" → experimental, no convencional, autoral.
- "oscura" / "densa" → noir, sombría, ambigua moralmente.
- "para pareja" → romántica o que la pareja disfrute igual.
- "tirada" / "boluda" / "para no pensar" → liviana, escapista, palomitera.
- "yorugua" / "argenta" / "latina" → del Cono Sur o Latinoamérica.
- "vieja" → clásica, anterior a los 80.
- "asiática" / "coreana" → cine de Corea, Japón, Hong Kong, etc.
`;

function buildPrompt(input: RecommenderInput, locale: "es" | "en"): string {
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
    return `You are a film critic writing a weekly column. Recommend 5 titles based on the reader's profile and request. Write like a critic, not a chatbot.

READER PROFILE:
- Recently watched: ${formatList(input.recentlyWatched, 15)}
- Want to watch (already on their list): ${formatList(input.watchlist, 15)}
- LOVED (high ratings): ${lovedList}
- DISLIKED (low ratings): ${dislikedList}
${!hasProfile ? "\n(NOTE: new user, no history yet — base recommendations on the query + mood, lean toward acclaimed/popular titles.)\n" : ""}
READER QUERY: ${input.query ?? "(no specific query)"}
MOOD: ${input.mood ?? "(no specific mood)"}

For each of 5 titles, write:

1. LEDE: ONE short sentence (max 90 chars) starting with "Because…" or similar editorial hook. Connect to something specific.
   Examples:
     "Because you loved «Drive» but want something slower."
     "Because your watchlist has three Finnish films you haven't seen."

2. BODY: 2-3 sentences of fluid PROSE (no bullets, no markdown). Atmospheric, specific. Max 300 chars.

RULES:
- Recommend 5 titles the reader has NOT watched and NOT yet in their list.
- Mix movies and TV when fitting.
- Align with LOVED ones, avoid anything like DISLIKED ones.
- YEAR IS CRITICAL: must match the actual TMDB/IMDb release year exactly. Verify mentally before answering.
- Use the title most commonly known in English (or original if no English release).
- Never invent titles.
- If profile is empty, lean toward acclaimed, well-known titles that match the mood/query.

Respond ONLY with valid JSON (no markdown fences, no preamble):
{"recommendations":[
  {"title":"...","year":2020,"lede":"Because...","body":"...","media_type":"movie"},
  ...
]}`;
  }

  return `Sos un crítico de cine que escribe una columna semanal. Recomendá 5 títulos basados en el perfil + pedido del lector. Escribí como crítico, no como chatbot.

${SLANG_GLOSSARY_ES}

PERFIL DEL LECTOR:
- Vistas recientes: ${formatList(input.recentlyWatched, 15)}
- En su lista de "quiero ver": ${formatList(input.watchlist, 15)}
- LE ENCANTARON (rating alto): ${lovedList}
- NO LE GUSTARON (rating bajo): ${dislikedList}
${!hasProfile ? "\n(NOTA: usuario nuevo, sin historial aún — basate en la consulta + mood, inclinate a títulos aclamados y conocidos.)\n" : ""}
CONSULTA DEL LECTOR: ${input.query ?? "(sin consulta específica)"}
MOOD: ${input.mood ?? "(sin mood específico)"}

Por cada uno de los 5 títulos, escribí:

1. LEDE: UNA oración corta (max 90 chars) que empieza con "Porque…" o un gancho editorial similar. Conectá con algo específico del perfil o la consulta.
   Ejemplos:
     "Porque amaste «Drive» pero querés algo más lento."
     "Porque tu watchlist tiene tres finlandesas sin ver."
     "Porque pediste algo que duela y tenés estómago para «Réquiem por un sueño»."

2. BODY: 2 a 3 oraciones de PROSA fluida (sin bullets, sin markdown). Atmosférico, específico. Max 300 caracteres. Si corresponde, mencioná dónde se puede ver en LatAm.

REGLAS CLAVE:
- Recomendá 5 títulos que el lector NO haya visto y NO estén en su lista.
- Mezclá pelis y series cuando tenga sentido.
- Priorizá títulos alineados con los que LE ENCANTARON. Evitá lo similar a los que NO LE GUSTARON.
- AÑO ES CRÍTICO: tiene que coincidir EXACTO con el año real de estreno en TMDB/IMDb. Verificá mentalmente antes de responder. Si dudás, no la recomiendes.
- Usá el título en el idioma original (en inglés si es producción anglo, en español si es hispana, etc.). NO traducciones latinoamericanas (no "El Padrino", sí "The Godfather").
- Castellano rioplatense, tuteo argentino (vos/tenés).
- Si el perfil está vacío, inclinate a títulos aclamados/conocidos que matcheen el mood.
- NO inventes títulos. Si no estás 100% seguro de la existencia, NO la pongas.

Respondé SOLO con JSON válido (sin fences markdown \`\`\`, sin preámbulo, sin explicaciones):
{"recommendations":[
  {"title":"...","year":2020,"lede":"Porque...","body":"...","media_type":"movie"},
  {"title":"...","year":2018,"lede":"Porque...","body":"...","media_type":"tv"}
]}`;
}

// Prompt simplificado para el retry: pide solo lo esencial, menos chance
// de que Gemini se vaya por las ramas y devuelva JSON corrupto.
function buildRetryPrompt(input: RecommenderInput, locale: "es" | "en"): string {
  if (locale === "en") {
    return `Recommend 5 well-known, acclaimed movies or TV shows for this request:

QUERY: ${input.query ?? "(none)"}
MOOD: ${input.mood ?? "(none)"}

Output ONLY this JSON (no extras):
{"recommendations":[
  {"title":"Movie Name","year":2020,"lede":"Brief because-style hook.","body":"2 sentences of why.","media_type":"movie"}
]}

5 entries. Real titles, real years. Mix movies and TV.`;
  }
  return `Recomendá 5 películas o series conocidas y aclamadas que matcheen este pedido:

CONSULTA: ${input.query ?? "(ninguna)"}
MOOD: ${input.mood ?? "(ninguno)"}

Salida SOLO este JSON (nada más):
{"recommendations":[
  {"title":"Nombre","year":2020,"lede":"Gancho corto estilo porque.","body":"2 oraciones de por qué.","media_type":"movie"}
]}

5 entradas. Títulos reales, años reales. Mezclá pelis y series.`;
}

// Parser tolerante. Maneja:
// - JSON con markdown fences (```json ... ```)
// - Texto basura antes/después del JSON (busca el primer { ... })
// - Campos legacy (why en lugar de body)
function safeParse(raw: string): Recommendation[] {
  let cleaned = raw.trim();

  // Sacar markdown fences si los hay
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    cleaned = cleaned.trim();
  }

  // Si hay texto basura, intentar extraer el bloque JSON principal
  if (!cleaned.startsWith("{")) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
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
    return [];
  }
}

// Llama a Gemini Flash y devuelve las recomendaciones parseadas.
// Si la primera tanda devuelve [], reintenta con prompt simplificado.
// Si todo falla, devuelve [].
export async function recommend(
  input: RecommenderInput,
  locale: "es" | "en" = "es"
): Promise<Recommendation[]> {
  const client = getClient();

  // Intento 1: prompt completo con contexto + slang glossary.
  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: buildPrompt(input, locale),
      config: {
        temperature: 0.8,
        maxOutputTokens: 4000,
        thinkingConfig: { thinkingBudget: 1024 },
      },
    });
    const text = response.text?.trim() ?? "";
    if (text) {
      const recs = safeParse(text);
      if (recs.length > 0) {
        console.log(`[ai-recommender] attempt 1: ${recs.length} recs`);
        return recs;
      }
      // Log el raw para debug si el parse falló
      console.warn(
        "[ai-recommender] attempt 1 parsed to empty. Raw (first 500):",
        text.slice(0, 500)
      );
    } else {
      console.warn("[ai-recommender] attempt 1 returned empty text");
    }
  } catch (err) {
    console.warn("[ai-recommender] attempt 1 threw:", err);
  }

  // Intento 2: prompt simplificado. Más probable que devuelva JSON limpio.
  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: buildRetryPrompt(input, locale),
      config: {
        temperature: 0.6,
        maxOutputTokens: 2500,
        thinkingConfig: { thinkingBudget: 512 },
      },
    });
    const text = response.text?.trim() ?? "";
    if (text) {
      const recs = safeParse(text);
      console.log(`[ai-recommender] attempt 2 (retry): ${recs.length} recs`);
      return recs;
    }
  } catch (err) {
    console.warn("[ai-recommender] attempt 2 threw:", err);
  }

  return [];
}
