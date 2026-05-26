import { GoogleGenAI } from "@google/genai";

// Wrapper para Gemini Flash. Genera "dato curioso" sobre una peli/serie.
// El prompt se construye con los datos disponibles (título, año, sinopsis,
// director, elenco) — todo lo que tengamos a mano para que la IA pueda
// inventar cosas reales y no alucinar.

export type TriviaInput = {
  title: string;
  originalTitle?: string | null;
  year: number | null;
  overview: string | null;
  director?: string | null;
  cast?: string[] | null;
  mediaType: "movie" | "tv";
};

// Singleton del cliente (lazy)
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

function buildPrompt(input: TriviaInput, locale: "es" | "en"): string {
  const isMovie = input.mediaType === "movie";
  const nounSingular = isMovie ? "película" : "serie";
  const nounSingularEn = isMovie ? "movie" : "TV show";

  if (locale === "en") {
    return `You are a film/TV trivia expert. Generate ONE interesting and concise fact about this ${nounSingularEn} in 1-2 sentences (max 200 chars).

Title: ${input.title}${input.originalTitle && input.originalTitle !== input.title ? ` (original: ${input.originalTitle})` : ""}
${input.year !== null ? `Year: ${input.year}` : ""}
${input.director ? `Director: ${input.director}` : ""}
${input.cast && input.cast.length > 0 ? `Cast: ${input.cast.slice(0, 3).join(", ")}` : ""}
${input.overview ? `Plot: ${input.overview.slice(0, 300)}` : ""}

Rules:
- Be factual. Only mention things you're confident are true.
- If you don't know specific verifiable trivia, write a single concise insight about the work's style, themes, or context.
- Do NOT make up awards, box office numbers, or quotes.
- No "Did you know" intro — go straight to the fact.
- Tone: casual, engaging, fan-friendly.
- Max 200 characters total.

Respond with ONLY the trivia text, no preamble or quotes.`;
  }

  return `Sos un experto en cine/series. Generá UN dato curioso e interesante sobre esta ${nounSingular} en 1-2 oraciones (máximo 200 caracteres).

Título: ${input.title}${input.originalTitle && input.originalTitle !== input.title ? ` (original: ${input.originalTitle})` : ""}
${input.year !== null ? `Año: ${input.year}` : ""}
${input.director ? `Dirección: ${input.director}` : ""}
${input.cast && input.cast.length > 0 ? `Elenco: ${input.cast.slice(0, 3).join(", ")}` : ""}
${input.overview ? `Sinopsis: ${input.overview.slice(0, 300)}` : ""}

Reglas:
- Tiene que ser fáctico. Sólo mencioná cosas que sabés con certeza.
- Si no conocés trivia específica verificable, escribí una observación corta sobre estilo, temas o contexto.
- NO inventes premios, recaudación o citas.
- Sin "¿Sabías que...?" de intro — andá directo al dato.
- Tono: cercano, entretenido, fan-friendly. Tuteo argentino (vos/tenés).
- Máximo 200 caracteres total.

Respondé SÓLO con el texto del dato, sin preámbulo ni comillas.`;
}

// Llama a Gemini Flash y devuelve el texto del dato.
// Si falla, propaga el error (el caller lo cachea como fail temporal).
export async function generateTrivia(
  input: TriviaInput,
  locale: "es" | "en"
): Promise<string> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildPrompt(input, locale),
    config: {
      temperature: 0.8, // un poco de creatividad pero no demasiada
      maxOutputTokens: 200,
      // Sin reasoning para Flash — más rápido y barato
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini devolvió texto vacío");
  }
  // Recortamos a 300 chars hard limit por las dudas (el prompt pide 200)
  return text.slice(0, 300);
}
