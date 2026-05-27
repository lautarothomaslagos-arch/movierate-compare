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
  why: string;
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
    return `You are a movie and TV show recommender. Suggest 5 titles based on the user's profile.

USER PROFILE:
- Recently watched: ${formatList(input.recentlyWatched, 15)}
- Want to watch (already in their list): ${formatList(input.watchlist, 15)}
- LOVED (high ratings): ${lovedList}
- DISLIKED (low ratings): ${dislikedList}

USER QUERY: ${input.query ?? "(no specific query)"}
MOOD: ${input.mood ?? "(no specific mood)"}

Rules:
- Recommend 5 titles the user has NOT watched and is NOT in their watchlist yet.
- Mix movies and TV shows when relevant.
- For each one, give a SHORT reason (max 120 chars) explaining why they'll like it based on their profile.
- Prioritize titles that match the LOVED ones in style/tone/themes.
- Avoid anything similar to the DISLIKED ones.
- Be specific with titles. Year MUST be the real release year.
- Don't invent titles. Only recommend titles you're confident exist.

Respond ONLY with valid JSON in this exact format (no markdown, no preamble, no trailing text):
{"recommendations":[
  {"title":"...","year":2020,"why":"...","media_type":"movie"},
  {"title":"...","year":2018,"why":"...","media_type":"tv"},
  ...
]}`;
  }

  return `Sos un recomendador de pelis y series. Sugerí 5 títulos basados en el perfil del usuario.

PERFIL DEL USUARIO:
- Vistas recientes: ${formatList(input.recentlyWatched, 15)}
- En su lista de "quiero ver": ${formatList(input.watchlist, 15)}
- LE ENCANTARON (rating alto): ${lovedList}
- NO LE GUSTARON (rating bajo): ${dislikedList}

CONSULTA DEL USUARIO: ${input.query ?? "(sin consulta específica)"}
MOOD: ${input.mood ?? "(sin mood específico)"}

Reglas:
- Recomendá 5 títulos que el user NO haya visto y NO estén ya en su lista.
- Mezclá pelis y series cuando tenga sentido.
- Por cada una, dame UNA RAZÓN CORTA (max 120 chars) explicando por qué le va a gustar según su perfil.
- Priorizá títulos parecidos en estilo/tono/temas a los que LE ENCANTARON.
- Evitá cualquier cosa similar a las que NO LE GUSTARON.
- Sé específico con los títulos. El año DEBE ser el real de estreno.
- No inventes títulos. Solo recomendá títulos que sabés con certeza que existen.
- Las razones en español, tuteo argentino (vos/tenés).

Respondé SOLO con JSON válido en este formato exacto (sin markdown, sin preámbulo, sin texto extra):
{"recommendations":[
  {"title":"...","year":2020,"why":"...","media_type":"movie"},
  {"title":"...","year":2018,"why":"...","media_type":"tv"},
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
      const why = typeof r.why === "string" ? r.why.trim() : "";
      const media_type =
        r.media_type === "tv" ? "tv" : r.media_type === "movie" ? "movie" : "movie";
      if (!title) continue;
      out.push({ title, year, why, media_type });
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
