import { GoogleGenAI } from "@google/genai";

// Wrapper para Gemini Flash. Genera UN veredicto editorial comparando 2-4
// títulos. La idea no es decir "ganó X" sino una observación tipo crítico:
// quién brilla en qué dimensión, cuándo elegir cada uno.
//
// Fase G.2.

export type VerdictInput = {
  items: Array<{
    title: string;
    year: number | null;
    media_type: "movie" | "tv";
    weighted: number | null; // promedio ponderado /10, o null si no hay
    genres?: string[];
  }>;
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

function buildPrompt(input: VerdictInput, locale: "es" | "en"): string {
  const list = input.items
    .map((it) => {
      const year = it.year ? ` (${it.year})` : "";
      const score = it.weighted !== null ? ` — score ${it.weighted.toFixed(1)}/10` : "";
      const genres = it.genres && it.genres.length > 0 ? ` — ${it.genres.slice(0, 3).join(", ")}` : "";
      const type = it.media_type === "tv" ? " [serie]" : " [peli]";
      return `• ${it.title}${year}${score}${genres}${type}`;
    })
    .join("\n");

  if (locale === "en") {
    return `You are a film critic giving a one-line verdict on a head-to-head comparison.

TITLES BEING COMPARED:
${list}

Write ONE single sentence (max 220 characters) that does the following:
- Identifies what each title is good at (not "who wins" but "where each shines").
- Suggests when to pick each (mood, context, audience).
- Tone: editorial, casual, no "Did you know". Critic voice.
- DO NOT mention scores explicitly.
- DO NOT start with "Both films..." or "These titles...". Get to the point.

Examples of the desired style:
- "Museum wins on box office and family nostalgia; The Cartographer, on critics and atmosphere. For family night, the first. For silence and coffee, the second."
- "Severance trades coldness for craft. Better Call Saul, slow burn for moral devastation."

Respond ONLY with the sentence. No preamble, no quotes.`;
  }

  return `Sos un crítico de cine dando un veredicto de UNA línea sobre una comparación cara a cara.

TÍTULOS COMPARADOS:
${list}

Escribí UNA sola oración (max 220 caracteres) que haga lo siguiente:
- Identificá en qué brilla cada título (no "quién gana" sino "dónde brilla cada uno").
- Sugerí cuándo elegir cada uno (mood, contexto, público).
- Tono: editorial, casual, sin "Sabías que". Voz de crítico.
- NO menciones los scores explícitamente.
- NO arranques con "Ambas pelis…" o "Estos títulos…". Andá al grano.
- Tuteo argentino (vos/tenés).

Ejemplos del estilo deseado:
- "Museum gana en taquilla y nostalgia familiar; The Cartographer, en crítica y atmósfera. Para noche en familia, la primera. Para silencio y café, la segunda."
- "Severance cambia frialdad por oficio. Better Call Saul, fuego lento por devastación moral."

Respondé SOLO con la oración. Sin preámbulo, sin comillas.`;
}

// Llama a Gemini Flash y devuelve el texto del veredicto.
// Si falla, propaga el error (el caller decide si mostrar fallback o nada).
export async function generateVerdict(
  input: VerdictInput,
  locale: "es" | "en" = "es"
): Promise<string> {
  if (input.items.length < 2) {
    throw new Error("Veredicto requiere al menos 2 ítems");
  }
  const client = getClient();
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildPrompt(input, locale),
    config: {
      temperature: 0.75,
      maxOutputTokens: 200,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  const text = response.text?.trim() ?? "";
  if (!text) throw new Error("Gemini devolvió texto vacío");
  // Hard limit por las dudas
  return text.slice(0, 300);
}
