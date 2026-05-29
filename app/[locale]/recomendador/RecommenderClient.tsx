"use client";

import {
  Brain,
  Clapperboard,
  Coffee,
  Film,
  Flame,
  Heart,
  Loader2,
  Moon,
  Smile,
  Sparkles,
  Tv,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Recommendation = {
  tmdb_id: number;
  title: string;
  year: number | null;
  // Fase G.2 — lede en serif italic, body en sans prose.
  lede: string;
  body: string;
  media_type: "movie" | "tv";
  poster_path: string | null;
};

type MoodKey =
  | "relaxed"
  | "intense"
  | "funny"
  | "romantic"
  | "classic"
  | "weekend"
  | "smart"
  | "dark";

// Sin emojis: iconos Lucide consistentes con el resto de la app.
const MOOD_PRESETS: Array<{ key: MoodKey; icon: LucideIcon }> = [
  { key: "relaxed", icon: Coffee },
  { key: "intense", icon: Flame },
  { key: "funny", icon: Smile },
  { key: "romantic", icon: Heart },
  { key: "classic", icon: Clapperboard },
  { key: "weekend", icon: Tv },
  { key: "smart", icon: Brain },
  { key: "dark", icon: Moon },
];

export function RecommenderClient({ isLogged }: { isLogged: boolean }) {
  const t = useTranslations("recommender");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSubmit() {
    if (!isLogged) {
      toast.error(t("loginRequired"));
      return;
    }
    if (loading) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim() || null,
          mood: mood ? t(`mood.${mood}`) : null,
          locale: locale === "en" ? "en" : "es",
        }),
      });

      if (res.status === 429) {
        const data = (await res.json()) as { message?: string };
        toast.error(data.message ?? t("rateLimitReached"));
        return;
      }

      if (!res.ok) {
        toast.error(t("genericError"));
        return;
      }

      const data = (await res.json()) as {
        recommendations: Recommendation[];
        error?: string;
        message?: string;
      };

      if (data.error === "no_results") {
        toast.error(data.message ?? t("noResults"));
        setRecommendations([]);
        return;
      }

      setRecommendations(data.recommendations ?? []);
    } catch (err) {
      console.error("[recommender] failed:", err);
      toast.error(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  function handleMoodClick(m: MoodKey) {
    setMood((current) => (current === m ? null : m));
  }

  return (
    <div className="space-y-6">
      {/* Input + chips de mood */}
      <Card className="p-4 sm:p-5 space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="recommender-query"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {t("inputLabel")}
          </label>
          <Input
            id="recommender-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("inputPlaceholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) handleSubmit();
            }}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block">
            {t("moodLabel")}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {MOOD_PRESETS.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => handleMoodClick(m.key)}
                  disabled={loading}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    mood === m.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{t(`mood.${m.key}`)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !isLogged}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("loading")}
            </>
          ) : (
            <>
              <Wand2 className="size-4" />
              {t("submitBtn")}
            </>
          )}
        </Button>

        {!isLogged && (
          <p className="text-xs text-muted-foreground text-center">
            {t("loginRequired")}
          </p>
        )}
      </Card>

      {/* aria-live region: lectores de pantalla anuncian cambios de
          estado (loading / resultados / vacío) sin que el user tenga
          que mover el foco. Polite = no interrumpe la lectura actual. */}
      <div role="status" aria-live="polite" className="sr-only">
        {loading
          ? t("loading")
          : recommendations.length > 0
            ? t("resultsHeading", { count: recommendations.length })
            : ""}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-3 sm:p-4">
              <div className="flex gap-3 sm:gap-4">
                <div className="shrink-0 w-16 sm:w-20 aspect-[2/3] rounded-md skeleton-warm" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 rounded skeleton-warm" />
                  <div className="h-5 w-2/3 rounded skeleton-warm" />
                  <div className="h-3 w-full rounded skeleton-warm" />
                  <div className="h-3 w-4/5 rounded skeleton-warm" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Recomendaciones */}
      {!loading && recommendations.length > 0 && (
        <div className="space-y-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            {t("resultsHeading", { count: recommendations.length })}
          </div>
          {recommendations.map((rec) => (
            <RecommendationCard key={`${rec.media_type}-${rec.tmdb_id}`} rec={rec} t={t} />
          ))}
        </div>
      )}

      {/* Empty state después de buscar sin resultados */}
      {!loading && hasSearched && recommendations.length === 0 && (
        <Card className="p-8 text-center border-dashed">
          <p className="text-sm text-muted-foreground">{t("noResults")}</p>
        </Card>
      )}

      {/* Estado inicial sin buscar */}
      {!loading && !hasSearched && (
        <Card className="p-6 sm:p-8 text-center border-dashed">
          <Wand2 className="size-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-semibold">{t("initialTitle")}</h3>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto">
            {t("initialBody")}
          </p>
        </Card>
      )}
    </div>
  );
}

function RecommendationCard({
  rec,
  t,
}: {
  rec: Recommendation;
  t: ReturnType<typeof useTranslations<"recommender">>;
}) {
  const detailHref =
    rec.media_type === "tv" ? `/serie/${rec.tmdb_id}` : `/movie/${rec.tmdb_id}`;
  const poster = rec.poster_path
    ? `https://image.tmdb.org/t/p/w185${rec.poster_path}`
    : null;

  const mediaLabel = rec.media_type === "tv" ? "Serie" : "Peli";

  return (
    <Card className="p-4 sm:p-5 group hover:ring-2 hover:ring-primary/40 transition-all">
      <Link href={detailHref} prefetch={false} className="flex gap-4 sm:gap-5">
        {/* Poster un poco más generoso para layout editorial */}
        <div className="relative shrink-0 w-20 sm:w-24 aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border shadow-[var(--shadow-1)]">
          {poster ? (
            <Image
              src={poster}
              alt={`Afiche de ${rec.title}`}
              fill
              sizes="(min-width: 640px) 96px, 80px"
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Film className="size-7 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Eyebrow mono: tipo · año */}
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2">
            {rec.media_type === "tv" ? (
              <Tv className="size-2.5" />
            ) : (
              <Film className="size-2.5" />
            )}
            {mediaLabel}
            {rec.year && <span>· {rec.year}</span>}
          </p>

          {/* Título serif italic */}
          <h3 className="font-serif italic font-normal text-xl sm:text-2xl leading-tight tracking-tight line-clamp-2 group-hover:text-primary transition-colors text-balance">
            {rec.title}
          </h3>

          {/* Lede serif italic — "Porque amaste X..." */}
          {rec.lede && (
            <p className="font-serif italic font-normal text-base sm:text-lg leading-snug text-foreground/85 text-balance">
              {rec.lede}
            </p>
          )}

          {/* Body en prosa sans */}
          {rec.body && (
            <p className="text-xs sm:text-sm text-muted-foreground/95 leading-relaxed line-clamp-3 sm:line-clamp-4">
              {rec.body}
            </p>
          )}
        </div>
      </Link>
    </Card>
  );
}
