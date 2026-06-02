import { GoogleGenAI } from "@google/genai";
import { NextResponse, type NextRequest } from "next/server";

// GET /api/admin/gemini-debug?token=XXX
// Endpoint de diagnóstico: prueba Gemini con queries mínimos y devuelve
// EXACTAMENTE lo que responde (success, error, finishReason, raw text).
// Sirve para entender por qué falla el recomendador sin tener que mirar
// logs de Vercel.
//
// Token: ADMIN_REFRESH_TOKEN (la misma del refresh de cache).

export const dynamic = "force-dynamic";

interface AttemptDebug {
  model: string;
  thinking: number;
  success: boolean;
  textPreview?: string;
  finishReason?: string | null;
  candidatesCount?: number;
  error?: string;
}

async function tryModel(
  client: GoogleGenAI,
  model: string,
  thinkingBudget: number
): Promise<AttemptDebug> {
  const prompt = `Devolvé JSON con 2 recomendaciones de pelis aclamadas:
{"recommendations":[
{"title":"Título","year":2020,"lede":"Porque...","body":"Por qué.","media_type":"movie"}
]}`;

  try {
    const config: Record<string, unknown> = {
      temperature: 0.7,
      maxOutputTokens: 2000,
      responseMimeType: "application/json",
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    };
    if (model.includes("2.5")) {
      config.thinkingConfig = { thinkingBudget };
    }

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: config as Parameters<typeof client.models.generateContent>[0]["config"],
    });

    const r = response as {
      text?: string | (() => string);
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    };

    let text = "";
    let finishReason: string | null = null;
    let candidatesCount = 0;

    if (typeof r.text === "string") {
      text = r.text;
    } else if (typeof r.text === "function") {
      try {
        text = (r.text as () => string)();
      } catch {
        // ignore
      }
    }
    if (Array.isArray(r.candidates)) {
      candidatesCount = r.candidates.length;
      if (!text && r.candidates[0]) {
        const parts = r.candidates[0].content?.parts ?? [];
        text = parts.map((p) => p.text ?? "").join("");
      }
      finishReason = r.candidates[0]?.finishReason ?? null;
    }

    return {
      model,
      thinking: thinkingBudget,
      success: text.length > 0,
      textPreview: text.slice(0, 500),
      finishReason,
      candidatesCount,
    };
  } catch (err) {
    return {
      model,
      thinking: thinkingBudget,
      success: false,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    };
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const expected = process.env.ADMIN_REFRESH_TOKEN;

  if (!expected) {
    return NextResponse.json(
      { error: "admin_token_not_configured" },
      { status: 500 }
    );
  }
  if (!token || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "GOOGLE_AI_API_KEY no está configurada",
        env_keys: Object.keys(process.env).filter((k) =>
          k.includes("GOOGLE") || k.includes("GEMINI")
        ),
      },
      { status: 500 }
    );
  }

  const client = new GoogleGenAI({ apiKey });

  const results: AttemptDebug[] = [];

  // Probar los 4 modelos
  const attempts = [
    { model: "gemini-2.5-flash", thinking: 0 },
    { model: "gemini-2.5-flash", thinking: 1024 },
    { model: "gemini-2.0-flash", thinking: 0 },
    { model: "gemini-1.5-flash", thinking: 0 },
  ];

  for (const a of attempts) {
    const r = await tryModel(client, a.model, a.thinking);
    results.push(r);
  }

  return NextResponse.json(
    {
      api_key_present: !!apiKey,
      api_key_length: apiKey.length,
      api_key_preview: `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`,
      attempts: results,
    },
    {
      // Pretty-print en el browser
      headers: { "Cache-Control": "no-store" },
    }
  );
}
