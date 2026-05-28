import { getLocale, getTranslations } from "next-intl/server";

import { generateTrivia, type TriviaInput } from "@/lib/ai-trivia";
import { cn } from "@/lib/utils";
import { createServiceClient } from "@/lib/supabase/server";

// Lee el cache de Supabase. Devuelve null si no existe.
async function readCache(
  tmdbId: number,
  mediaType: "movie" | "tv",
  locale: string
): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("movie_trivia")
      .select("text")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .eq("locale", locale)
      .maybeSingle<{ text: string }>();

    if (error) {
      console.warn("[trivia:read] error:", error.message);
      return null;
    }
    return data?.text ?? null;
  } catch (err) {
    console.warn("[trivia:read] threw:", err);
    return null;
  }
}

async function writeCache(
  tmdbId: number,
  mediaType: "movie" | "tv",
  locale: string,
  text: string
): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("movie_trivia").upsert(
      {
        tmdb_id: tmdbId,
        media_type: mediaType,
        locale,
        text,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "tmdb_id,media_type,locale" }
    );
    if (error) {
      console.warn("[trivia:write] error:", error.message);
    }
  } catch (err) {
    console.warn("[trivia:write] threw:", err);
  }
}

// Trivia editorial (Fase G.1):
// - Comilla angular grande («) como ornamento de fondo en serif italic.
// - Border-left brass 2px.
// - Label "Sabías que" en mono uppercase.
// - Cuerpo en blockquote serif italic, text-balance.
// - Atribución "— Gemini" en mono pequeño al pie.
// - Sin caja gris ni ícono Sparkles: el contenido manda.
export async function TriviaSection({
  tmdbId,
  mediaType = "movie",
  input,
}: {
  tmdbId: number;
  mediaType?: "movie" | "tv";
  input: TriviaInput;
}) {
  const t = await getTranslations("trivia");
  const localeRaw = await getLocale();
  const locale: "es" | "en" = localeRaw === "en" ? "en" : "es";

  // 1) Cache hit
  let text = await readCache(tmdbId, mediaType, locale);

  // 2) Cache miss → llamar a Gemini + cachear
  if (!text) {
    try {
      text = await generateTrivia(input, locale);
      await writeCache(tmdbId, mediaType, locale, text);
    } catch (err) {
      console.warn("[trivia:gen] failed:", err);
      return null;
    }
  }

  return (
    <aside className="relative overflow-hidden py-7 sm:py-9 px-5 sm:px-7">
      {/* Comilla angular gigante decorativa */}
      <span
        aria-hidden
        className={cn(
          "absolute left-4 top-3 font-serif italic font-normal",
          "text-[120px] leading-[0.7] text-primary opacity-15 select-none pointer-events-none"
        )}
      >
        «
      </span>

      <div className="relative pl-3.5 border-l-2 border-primary max-w-[58ch]">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2.5"
          title={t("aiBy")}
        >
          {t("heading")}
        </p>
        <blockquote className="font-serif italic font-normal text-xl sm:text-2xl leading-snug text-balance text-foreground/95">
          {text}
        </blockquote>
        <footer className="flex items-center gap-3.5 mt-4 font-mono text-[10px] text-muted-foreground tracking-[0.04em]">
          <span>— {t("aiBy")}</span>
        </footer>
      </div>
    </aside>
  );
}

export function TriviaSkeleton() {
  return (
    <aside className="relative overflow-hidden py-7 sm:py-9 px-5 sm:px-7">
      <div className="pl-3.5 border-l-2 border-primary/40 max-w-[58ch] space-y-2.5">
        <div className="h-2.5 w-20 rounded skeleton-warm" />
        <div className="h-5 w-full rounded skeleton-warm" />
        <div className="h-5 w-4/5 rounded skeleton-warm" />
        <div className="h-2.5 w-32 rounded skeleton-warm mt-3" />
      </div>
    </aside>
  );
}
