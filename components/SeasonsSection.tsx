import { Film, Star, ThumbsDown } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTvSeason, getYear } from "@/lib/tmdb";
import type { TmdbEpisode } from "@/types/movie";

type SeasonSummary = {
  id: number;
  season_number: number;
  name: string;
  air_date?: string | null;
  poster_path?: string | null;
  episode_count?: number | null;
  vote_average?: number | null;
};

// Para cada temporada, encuentra el mejor y peor episodio por rating.
// Filtra temporadas "Specials" (season_number === 0).
async function loadBestWorst(
  tvId: number,
  seasonNumber: number
): Promise<{
  best: TmdbEpisode | null;
  worst: TmdbEpisode | null;
} | null> {
  try {
    const season = await getTvSeason(tvId, seasonNumber);
    const rated = season.episodes.filter(
      (e) => e.vote_average !== null && e.vote_average !== undefined && e.vote_count !== null && (e.vote_count ?? 0) >= 5
    );
    if (rated.length === 0) return { best: null, worst: null };
    let best = rated[0];
    let worst = rated[0];
    for (const e of rated) {
      if ((e.vote_average ?? 0) > (best.vote_average ?? 0)) best = e;
      if ((e.vote_average ?? 0) < (worst.vote_average ?? 0)) worst = e;
    }
    return { best, worst: best.id === worst.id ? null : worst };
  } catch (err) {
    console.warn(`[SeasonsSection] season ${seasonNumber} failed:`, err);
    return null;
  }
}

export async function SeasonsSection({
  tvId,
  seasons,
}: {
  tvId: number;
  seasons: SeasonSummary[];
}) {
  const t = await getTranslations("seasons");

  const validSeasons = seasons.filter((s) => s.season_number > 0);
  if (validSeasons.length === 0) return null;

  // Limitamos a las primeras 10 temporadas para no quemar requests.
  const display = validSeasons.slice(0, 10);

  // Fetch en paralelo del best/worst de cada
  const enriched = await Promise.all(
    display.map(async (s) => ({
      ...s,
      bw: await loadBestWorst(tvId, s.season_number),
    }))
  );

  return (
    <div className="space-y-2">
      {enriched.map((s) => {
        const year = getYear(s.air_date);
        const poster = s.poster_path
          ? `https://image.tmdb.org/t/p/w154${s.poster_path}`
          : null;
        return (
          <Card key={s.id} className="p-3 flex gap-3 items-start">
            <div className="relative w-12 sm:w-14 aspect-[2/3] shrink-0 bg-muted rounded overflow-hidden">
              {poster ? (
                <Image
                  src={poster}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Film className="size-4 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-semibold text-sm">
                  {t("seasonLabel", { n: s.season_number })}
                </span>
                {year !== null && (
                  <span className="text-xs text-muted-foreground">{year}</span>
                )}
                {s.episode_count !== null && s.episode_count !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    · {t("episodes", { count: s.episode_count })}
                  </span>
                )}
                {s.vote_average !== null &&
                  s.vote_average !== undefined &&
                  s.vote_average > 0 && (
                    <span className="text-xs font-semibold text-emerald-400 tabular-nums">
                      ★ {s.vote_average.toFixed(1)}
                    </span>
                  )}
              </div>
              {s.bw ? (
                <div className="space-y-1 text-xs">
                  {s.bw.best && (
                    <div className="inline-flex items-start gap-1.5">
                      <Star className="size-3 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">
                        {t("bestEp")}:
                      </span>
                      <span className="font-medium truncate">
                        E{s.bw.best.episode_number} · {s.bw.best.name}
                      </span>
                      <span className="text-emerald-400 font-semibold tabular-nums shrink-0">
                        {s.bw.best.vote_average?.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {s.bw.worst && (
                    <div className="inline-flex items-start gap-1.5">
                      <ThumbsDown className="size-3 text-rose-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">
                        {t("worstEp")}:
                      </span>
                      <span className="font-medium truncate">
                        E{s.bw.worst.episode_number} · {s.bw.worst.name}
                      </span>
                      <span className="text-rose-400 font-semibold tabular-nums shrink-0">
                        {s.bw.worst.vote_average?.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  {t("noEpisodes")}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function SeasonsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-3 flex gap-3">
          <Skeleton className="w-12 sm:w-14 aspect-[2/3] rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </Card>
      ))}
    </div>
  );
}
