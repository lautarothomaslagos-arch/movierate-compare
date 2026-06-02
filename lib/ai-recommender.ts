import { GoogleGenAI } from "@google/genai";

// Wrapper para Gemini Flash. Recomienda 5 títulos basándose en el contexto
// del user (historial reciente, watchlist, top reviews) + un query libre o
// mood opcional. Devuelve un array tipado con título, año, lede y body.
//
// v4 — debugging por qué fallaba siempre con queries simples:
//   - Sacamos responseSchema (puede tener problemas de formato con la SDK
//     actual). Usamos solo responseMimeType: "application/json" + prompt
//     muy explícito.
//   - Safety settings al MÍNIMO (las recomendaciones de cine no deberían
//     dispararse por filtros, pero "oscuro" / "violencia" / etc. podían).
//   - 4 fallback attempts con diferentes modelos y configs, así si Gemini
//     2.5 tiene un blip caemos a 1.5 que es más estable.
//   - extractText con manejo de errores en cada acceso de propiedad —
//     algunas versiones de la SDK tiran si no hay candidates.
//   - Logging detallado: cada attempt loguea modelo, tokens output, raw
//     preview, finishReason.

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

const SLANG_GLOSSARY_ES = `GLOSARIO RIOPLATENSE:
- "dolor de panza" → intensa emocionalmente, devastadora
- "una bomba" / "tremenda" → brillante, imperdible
- "te lleva puesto" → arrolladora
- "lágrima fácil" → triste, melancólica
- "te volás la cabeza" → sci-fi, mindfuck
- "para colgarse" → fácil de ver, maratón
- "rara" / "loca" → experimental, autoral
- "oscura" / "densa" → noir, sombría
- "para no pensar" → liviana, escapista
- "magia" → fantasy, fantástico, realismo mágico
- "para pareja" → romántica`;

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
      : "(ninguna)";

  const dislikedList =
    input.disliked.length > 0
      ? input.disliked
          .slice(0, 5)
          .map(
            (it) =>
              `${it.title}${it.year ? ` (${it.year})` : ""} — ${it.rating.toFixed(1)}/10`
          )
          .join(", ")
      : "(ninguna)";

  if (locale === "en") {
    return `Recommend 5 acclaimed movies or TV shows.

USER:
- Recently watched: ${formatList(input.recentlyWatched, 10)}
- Wants to watch: ${formatList(input.watchlist, 10)}
- LOVED: ${lovedList}
- DISLIKED: ${dislikedList}

REQUEST: query="${input.query ?? "any"}", mood="${input.mood ?? "any"}"

Return ONLY this JSON (no markdown, no preamble, no text outside JSON):
{"recommendations":[
{"title":"Movie Title","year":2020,"lede":"Because hook here.","body":"2-3 sentences of why they'll love it.","media_type":"movie"},
{"title":"Show Title","year":2018,"lede":"Because hook here.","body":"2-3 sentences.","media_type":"tv"}
]}

Rules:
- Exactly 5 items
- Real titles, real years (verify in your knowledge)
- Mix movies and TV
- Original-language titles (not Spanish translations like "El Padrino" - use "The Godfather")
- Match LOVED style, avoid DISLIKED style
- Lede starts with "Because" (max 90 chars)
- Body 2-3 sentences atmospheric (max 300 chars)
- Don't repeat anything from "Recently watched" or "Wants to watch"`;
  }

  return `Recomendá 5 películas o series aclamadas.

${SLANG_GLOSSARY_ES}

USUARIO:
- Vistas recientes: ${formatList(input.recentlyWatched, 10)}
- Quiere ver: ${formatList(input.watchlist, 10)}
- LE ENCANTARON: ${lovedList}
- NO LE GUSTARON: ${dislikedList}

PEDIDO: consulta="${input.query ?? "cualquiera"}", mood="${input.mood ?? "cualquiera"}"

Devolvé SOLO este JSON (sin markdown, sin preámbulo, sin texto fuera del JSON):
{"recommendations":[
{"title":"Título","year":2020,"lede":"Porque gancho.","body":"2-3 oraciones de por qué le va a gustar.","media_type":"movie"},
{"title":"Otro Título","year":2018,"lede":"Porque gancho.","body":"2-3 oraciones.","media_type":"tv"}
]}

Reglas:
- Exactamente 5 items
- Títulos reales, años reales (verificá en tu conocimiento)
- Mezclá pelis y series
- Títulos en idioma original (NO traducciones latinas: usá "The Godfather", no "El Padrino")
- Alineados con los LE ENCANTARON, evitar similares a los NO LE GUSTARON
- Lede empieza con "Porque" (max 90 chars)
- Body 2-3 oraciones atmosféricas (max 300 chars)
- Castellano rioplatense (vos/tenés)
- No repetir nada de "Vistas recientes" o "Quiere ver"`;
}

function safeParse(raw: string): Recommendation[] {
  let cleaned = raw.trim();

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
    console.warn("[ai-recommender] parse failed:", err);
    console.warn("[ai-recommender] cleaned preview:", cleaned.slice(0, 300));
    return [];
  }
}

// Extracción robusta del texto del response. La SDK 2.x puede devolver
// estructuras variadas; manejamos varias.
function extractText(response: unknown): { text: string; finishReason: string | null } {
  if (!response || typeof response !== "object") {
    return { text: "", finishReason: null };
  }
  const r = response as {
    text?: string | (() => string);
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };

  // Versión 1: response.text como string directo
  if (typeof r.text === "string") {
    return { text: r.text.trim(), finishReason: null };
  }
  // Versión 2: response.text como función getter
  if (typeof r.text === "function") {
    try {
      const t = (r.text as () => string)();
      return { text: typeof t === "string" ? t.trim() : "", finishReason: null };
    } catch {
      // Sigue al próximo método
    }
  }
  // Versión 3: navegar candidates
  if (Array.isArray(r.candidates) && r.candidates[0]) {
    const cand = r.candidates[0];
    const parts = cand.content?.parts ?? [];
    const text = parts
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    return { text, finishReason: cand.finishReason ?? null };
  }
  return { text: "", finishReason: null };
}

// Safety settings al mínimo. El recomendador es de cine, no hay nada
// peligroso. Sin esto, queries como "algo oscuro" o "violencia" podían
// disparar bloqueos automáticos.
const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

type AttemptResult = {
  recs: Recommendation[];
  rawPreview?: string;
  finishReason?: string | null;
  threwError?: string;
};

async function tryGemini(
  prompt: string,
  model: string,
  options: { thinkingBudget?: number; maxOutputTokens?: number } = {}
): Promise<AttemptResult> {
  const client = getClient();
  const { thinkingBudget = 0, maxOutputTokens = 4000 } = options;

  try {
    const config: Record<string, unknown> = {
      temperature: 0.8,
      maxOutputTokens,
      responseMimeType: "application/json",
      safetySettings: SAFETY_SETTINGS,
    };
    // Solo agregamos thinkingConfig si el modelo lo soporta (2.5)
    if (model.includes("2.5")) {
      config.thinkingConfig = { thinkingBudget };
    }

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: config as Parameters<typeof client.models.generateContent>[0]["config"],
    });

    const { text, finishReason } = extractText(response);

    if (!text) {
      console.warn(
        `[ai-recommender] ${model} empty output. finishReason:`,
        finishReason
      );
      return { recs: [], finishReason };
    }

    const recs = safeParse(text);
    console.log(
      `[ai-recommender] ${model} (think=${thinkingBudget}): ${recs.length} recs. finishReason=${finishReason}`
    );
    return { recs, rawPreview: text.slice(0, 200), finishReason };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ai-recommender] ${model} threw:`, msg);
    return { recs: [], threwError: msg };
  }
}

export async function recommend(
  input: RecommenderInput,
  locale: "es" | "en" = "es"
): Promise<Recommendation[]> {
  const prompt = buildPrompt(input, locale);

  // 4 attempts en cascada, del más probable al más fallback.
  const attempts = [
    { model: "gemini-2.5-flash", thinkingBudget: 0 },
    { model: "gemini-2.5-flash", thinkingBudget: 1024 },
    { model: "gemini-2.0-flash", thinkingBudget: 0 },
    { model: "gemini-1.5-flash", thinkingBudget: 0 },
  ];

  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i];
    const result = await tryGemini(prompt, a.model, {
      thinkingBudget: a.thinkingBudget,
    });
    if (result.recs.length > 0) {
      console.log(
        `[ai-recommender] SUCCESS on attempt ${i + 1} (${a.model})`
      );
      return result.recs;
    }
  }

  console.error(
    `[ai-recommender] ALL ATTEMPTS FAILED. query=${input.query} mood=${input.mood}`
  );
  return [];
}
