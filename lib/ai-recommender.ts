import { GoogleGenAI } from "@google/genai";

// Wrapper para Gemini Flash. Recomienda 5 títulos basándose en el contexto
// del user (historial reciente, watchlist, top reviews) + un query libre o
// mood opcional. Devuelve un array tipado con título, año, por qué y media_type.
//
// Es responsabilidad del caller resolver los IDs reales en TMDB (vía
// /search/multi) — la IA solo escupe títulos + años, no IDs.

export type RecommenderInput = {
  // Lo último que el user vio (max 15 items)
  recentlyWatched: Array<{ title: string; year: number | null }>;
  // Lo que el user quiere ver (max 15 items)
  watchlist: Array<{ title: string; year: number | null }>;
  // Las que más le gustaron (max 5, rating descendente)
  loved: Array<{ title: string; year: number | null; rating: number }>;
  // Las que menos le gustaron (max 5, rating ascendente). Para que la IA
  // sepa qué evitar.
  disliked: Array<{ title: string; year: number | null; rating: number }>;
  // Texto libre del user — ej. "algo de los 80 con tono dark", "comedia para
  // pareja", "como Better Call Saul pero serie nueva". Opcional.
  query: string | null;
  // Mood preset opcional (ver UI para opciones)
  mood: string | null;
};

export type Recommendation = {
  title: string;
  year: number | null;
  // Lede corto en estilo editorial (1 oración, idealmente arranca con
  // "Porque…"). Va a renderizarse en serif italic. Ej:
  //   "Porque amaste «Drive» pero querés algo más lento."
  lede: string;
  // Cuerpo en prosa fluida (2-3 oraciones). Va en sans regular.
  body: string;
  media_type: "movie" | "tv";
};

// Singleton client (lazy)
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

  if (locale === "en") {
    return `You are a film critic writing a weekly column. Recommend 5 titles based on the reader's profile. Write like a critic, not a chatbot.

READER PROFILE:
- Recently watched: ${formatList(input.recentlyWatched, 15)}
- Want to watch (already on their list): ${formatList(input.watchlist, 15)}
- LOVED (high ratings): ${lovedList}
- DISLIKED (low ratings): ${dislikedList}

READER QUERY: ${input.query ?? "(no specific query)"}
MOOD: ${input.mood ?? "(no specific mood)"}

For each of the 5 titles, write TWO things:

1. LEDE: ONE short sentence (max 90 chars) that begins with "Because" or a similar editorial hook. It connects the recommendation to something specific in their profile.
   Examples:
     "Because you loved «Drive» but want something slower."
     "Because your watchlist has three Finnish films you haven't seen."
     "Because you rated «Annihilation» a 9."

2. BODY: 2 to 3 sentences of fluid PROSE (no bullets, no markdown) that describe why they'll like it. Atmospheric, specific. Mention where to watch if relevant. Max 300 chars.

Rules:
- Recommend 5 titles they have NOT watched and are NOT on their watchlist yet.
- Mix movies and TV shows when it fits.
- Prioritize titles aligned in style/tone/themes with the LOVED ones.
- Avoid anything similar to the DISLIKED ones.
- Be specific with titles. Year MUST be the real release year.
- Don't invent titles.

Respond ONLY with valid JSON in this exact format (no markdown, no preamble):
{"recommendations":[
  {"title":"...","year":2020,"lede":"Because...","body":"...","media_type":"movie"},
  {"title":"...","year":2018,"lede":"Because...","body":"...","media_type":"tv"},
  ...
]}`;
  }

  return `Sos un crítico de cine que escribe una columna semanal. Recomendá 5 títulos basados en el perfil del lector. Escribí como crítico, no como chatbot.

PERFIL DEL LECTOR:
- Vistas recientes: ${formatList(input.recentlyWatched, 15)}
- En su lista de "quiero ver": ${formatList(input.watchlist, 15)}
- LE ENCANTARON (rating alto): ${lovedList}
- NO LE GUSTARON (rating bajo): ${dislikedList}

CONSULTA DEL LECTOR: ${input.query ?? "(sin consulta específica)"}
MOOD: ${input.mood ?? "(sin mood específico)"}

Por cada uno de los 5 títulos, escribí DOS cosas:

1. LEDE: UNA oración corta (max 90 caracteres) que empieza con "Porque" o un gancho editorial similar. Conectá la recomendación con algo específico de su perfil.
   Ejemplos:
     "Porque amaste «Drive» pero querés algo más lento."
     "Porque tu watchlist tiene tres finlandesas sin ver."
     "Porque le pusiste 9 a «Annihilation»."

2. BODY: 2 a 3 oraciones de PROSA fluida (sin bullets, sin markdown) que describan por qué le va a gustar. Atmosférico, específico. Si corresponde, mencioná dónde se puede ver. Max 300 caracteres.

Reglas:
- Recomendá 5 títulos que el lector NO haya visto y NO estén en su lista.
- Mezclá pelis y series cuando tenga sentido.
- Priorizá títulos alineados en estilo/tono/temas con los que LE ENCANTARON.
- Evitá cualquier cosa similar a las que NO LE GUSTARON.
- Sé específico con los títulos. El año DEBE ser el real de estreno.
- No inventes títulos.
- Todo en español, tuteo argentino (vos/tenés).

Respondé SOLO con JSON válido en este formato exacto (sin markdown, sin preámbulo):
{"recommendations":[
  {"title":"...","year":2020,"lede":"Porque...","body":"...","media_type":"movie"},
  {"title":"...","year":2018,"lede":"Porque...","body":"...","media_type":"tv"},
  ...
]}`;
}

// Parsea el JSON que devuelve la IA. Tolerante a markdown wrapping
// (```json ... ```) por si Gemini lo agrega.
function safeParse(raw: string): Recommendation[] {
  let cleaned = raw.trim();
  // Sacar fences si los hay
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    cleaned = cleaned.trim();
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
      // Aceptamos lede/body nuevo formato, pero también "why" legacy si el
      // prompt no devuelve los dos campos (degradamos a body genérico).
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
// Si la respuesta no es parseable, devuelve [].
export async function recommend(
  input: RecommenderInput,
  locale: "es" | "en" = "es"
): Promise<Recommendation[]> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildPrompt(input, locale),
    config: {
      temperature: 0.7,
      maxOutputTokens: 1500,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  const text = response.text?.trim() ?? "";
  if (!text) return [];
  return safeParse(text);
}
