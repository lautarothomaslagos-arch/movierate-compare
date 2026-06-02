import { getTranslations } from "next-intl/server";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import { computeWeightedAverage } from "@/components/RatingsAverage";
import { getRatings } from "@/lib/ratings";
import { getTvRatings } from "@/lib/tv-ratings";
import { cn } from "@/lib/utils";
import type { PlatformRating, RatingsResponse } from "@/types/movie";

// Bloque "billboard" del weighted average dentro del Billboard.
// Server component async — los ratings se fetchean acá y llegan por
// streaming a través de Suspense. React.cache dedupea con la sección
// Ratings de más abajo.

type Platform = "imdb" | "rt" | "metacritic" | "tmdb" | "letterboxd";

const SOURCE_COLORS: Record<Platform, string> = {
  imdb: "text-[var(--imdb)]",
  rt: "text-[var(--rt)]",
  metacritic: "text-[var(--metac)]",
  tmdb: "text-[var(--tmdb)]",
  letterboxd: "text-[var(--lbox-g)]",
};

const SOURCE_LABELS: Record<Platform, string> = {
  imdb: "IMDb",
  rt: "RT",
  metacritic: "MC",
  tmdb: "TMDB",
  letterboxd: "Lbxd",
};

export async function WeightedScoreHero({
  tmdbId,
  mediaType = "movie",
}: {
  tmdbId: number;
  mediaType?: "movie" | "tv";
}) {
  const ratings: RatingsResponse =
    mediaType === "tv" ? await getTvRatings(tmdbId) : await getRatings(tmdbId);

  const avg = computeWeightedAverage(ratings);
  const t = await getTranslations("ratings");

  // Si no hay ningún rating disponible, no renderizamos el bloque.
  if (!avg) return null;

  const sources: Array<{
    key: Platform;
    rating: PlatformRating;
  }> = [];
  const order: Platform[] = ["imdb", "rt", "metacritic", "tmdb", "letterboxd"];
  for (const k of order) {
    const r = ratings[k];
    if (r) sources.push({ key: k, rating: r });
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
      {/* Número grande - el momento más diseñado de la app */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("weightedAverage")}
        </p>
        <p
          className={cn(
            "font-serif italic font-normal text-primary",
            "text-[clamp(3.5rem,7vw+0.5rem,6rem)] leading-[0.85]"
          )}
        >
          {/* Counter-up: el número grande sube de 0 al promedio al cargar.
              Da énfasis al "veredicto" sin ser distractor. Respeta
              prefers-reduced-motion vía AnimatedNumber. */}
          <span className="tabular-nums">
            <AnimatedNumber value={avg.score10} duration={900} decimals={1} />
          </span>
          <span className="font-mono not-italic text-xs text-muted-foreground ml-1 tracking-normal">
            /10
          </span>
        </p>
      </div>

      {/* Pie de imprenta con las 5 fuentes — texto chico, mono, color por fuente */}
      <ul
        aria-label={t("averageHint", { count: avg.contributing })}
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 self-end pb-1.5 font-mono text-[10px] tracking-[0.04em] text-muted-foreground"
      >
        {sources.map(({ key, rating }) => (
          <li key={key} className="inline-flex items-baseline gap-1">
            <span className={cn("font-medium", SOURCE_COLORS[key])}>
              {SOURCE_LABELS[key]}
            </span>
            <span className="tabular-nums">
              {key === "rt" || key === "metacritic"
                ? Math.round(rating.score10 * 10)
                : rating.score10.toFixed(1)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Skeleton que ocupa el mismo espacio que el bloque real,
// previene CLS al hacer streaming.
export function WeightedScoreHeroSkeleton() {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3">
      <div>
        <div className="h-2.5 w-20 rounded skeleton-warm" />
        <div className="mt-2 h-[clamp(3.5rem,7vw+0.5rem,6rem)] w-32 rounded skeleton-warm" />
      </div>
      <div className="flex gap-3 self-end pb-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-2.5 w-10 rounded skeleton-warm" />
        ))}
      </div>
    </div>
  );
}
