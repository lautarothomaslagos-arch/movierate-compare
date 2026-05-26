import { Sparkles } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { generateTrivia, type TriviaInput } from "@/lib/ai-trivia";
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

// Server Component async. Lee cache primero, sino genera con IA.
// Si IA falla (Gemini caído, sin key, etc.), devuelve null y la sección
// no se renderiza.
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
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
      <div className="flex items-start gap-3">
        <div className="shrink-0 size-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="size-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
            {t("heading")}
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{text}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1.5">
            {t("aiBy")}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function TriviaSkeleton() {
  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
      <div className="flex items-start gap-3">
        <Skeleton className="shrink-0 size-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </Card>
  );
}
