import { getLocale, getTranslations } from "next-intl/server";

import { generateVerdict, type VerdictInput } from "@/lib/ai-verdict";
import { createServiceClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// Veredicto IA para /comparar — Fase G.2.
// Cache read-through en Supabase (tabla compare_verdicts). Key compone
// los items ordenados + locale para que el orden no importe.

function buildCacheKey(
  items: Array<{ media_type: "movie" | "tv"; tmdb_id: number }>,
  locale: string
): string {
  const tokens = items
    .map((it) => `${it.media_type}-${it.tmdb_id}`)
    .sort();
  return `${tokens.join("+")}:${locale}`;
}

async function readCache(cacheKey: string): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("compare_verdicts")
      .select("text")
      .eq("cache_key", cacheKey)
      .maybeSingle<{ text: string }>();
    if (error) {
      console.warn("[verdict:read] error:", error.message);
      return null;
    }
    return data?.text ?? null;
  } catch (err) {
    console.warn("[verdict:read] threw:", err);
    return null;
  }
}

async function writeCache(cacheKey: string, text: string): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("compare_verdicts").upsert(
      {
        cache_key: cacheKey,
        text,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "cache_key" }
    );
    if (error) console.warn("[verdict:write] error:", error.message);
  } catch (err) {
    console.warn("[verdict:write] threw:", err);
  }
}

export async function CompareVerdict({
  items,
}: {
  items: Array<{
    tmdb_id: number;
    media_type: "movie" | "tv";
    title: string;
    year: number | null;
    weighted: number | null;
    genres?: string[];
  }>;
}) {
  if (items.length < 2) return null;

  const localeRaw = await getLocale();
  const locale: "es" | "en" = localeRaw === "en" ? "en" : "es";
  const t = await getTranslations("compare");

  const cacheKey = buildCacheKey(items, locale);

  // 1) Cache hit
  let text = await readCache(cacheKey);

  // 2) Cache miss → llamar a Gemini y cachear
  if (!text) {
    try {
      const input: VerdictInput = {
        items: items.map((it) => ({
          title: it.title,
          year: it.year,
          media_type: it.media_type,
          weighted: it.weighted,
          genres: it.genres,
        })),
      };
      text = await generateVerdict(input, locale);
      await writeCache(cacheKey, text);
    } catch (err) {
      console.warn("[verdict:gen] failed:", err);
      return null;
    }
  }

  return (
    <aside
      className={cn(
        "relative overflow-hidden rounded-lg ring-1 ring-border bg-card",
        "py-5 sm:py-6 px-5 sm:px-7"
      )}
    >
      {/* Comilla angular decorativa */}
      <span
        aria-hidden
        className="absolute left-3 top-1 font-serif italic font-normal text-[100px] leading-[0.7] text-primary opacity-15 select-none pointer-events-none"
      >
        «
      </span>

      <div className="relative pl-3 border-l-2 border-primary max-w-[64ch]">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          {t("verdictLabel")}
        </p>
        <p className="font-serif italic font-normal text-base sm:text-lg leading-snug text-foreground/95 text-balance">
          {text}
        </p>
        <p className="mt-3 font-mono text-[10px] text-muted-foreground tracking-[0.04em]">
          — {t("verdictBy")}
        </p>
      </div>
    </aside>
  );
}

export function CompareVerdictSkeleton() {
  return (
    <div className="rounded-lg ring-1 ring-border bg-card py-5 sm:py-6 px-5 sm:px-7">
      <div className="pl-3 border-l-2 border-primary/40 max-w-[64ch] space-y-2">
        <div className="h-2.5 w-24 rounded skeleton-warm" />
        <div className="h-5 w-full rounded skeleton-warm" />
        <div className="h-5 w-4/5 rounded skeleton-warm" />
        <div className="h-2.5 w-20 rounded skeleton-warm mt-2" />
      </div>
    </div>
  );
}
