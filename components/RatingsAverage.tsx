import { Award } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";
import type { PlatformRating, RatingsResponse } from "@/types/movie";

// Computa el promedio ponderado de los ratings disponibles, normalizando
// todos a /10. Devuelve null si no hay ningún rating.
//
// Por qué ponderado y no simple: damos peso distinto por plataforma para
// reflejar credibilidad/escala. Ej: IMDb con millones de votos pesa más
// que Letterboxd (audiencia más chica) o Metacritic (críticos, no audiencia).
const WEIGHTS: Record<keyof Omit<RatingsResponse, "tmdbId" | "errors">, number> = {
  imdb: 1.0,
  rt: 0.9, // críticos
  metacritic: 0.9, // críticos
  tmdb: 0.8, // audiencia internacional
  letterboxd: 0.8, // audiencia cinéfila
  filmaffinity: 0, // ya no la usamos
};

type Platform = "imdb" | "rt" | "metacritic" | "tmdb" | "letterboxd";

export function computeWeightedAverage(ratings: RatingsResponse): {
  score10: number;
  contributing: number; // cantidad de plataformas que aportaron
  highest: Platform | null;
  lowest: Platform | null;
} | null {
  const entries: Array<[Platform, PlatformRating]> = [];
  const platforms: Platform[] = ["imdb", "rt", "metacritic", "tmdb", "letterboxd"];
  for (const p of platforms) {
    const r = ratings[p];
    if (r) entries.push([p, r]);
  }
  if (entries.length === 0) return null;

  let weighted = 0;
  let totalWeight = 0;
  let highestVal = -Infinity;
  let lowestVal = Infinity;
  let highest: Platform | null = null;
  let lowest: Platform | null = null;
  for (const [p, r] of entries) {
    const w = WEIGHTS[p];
    weighted += r.score10 * w;
    totalWeight += w;
    if (r.score10 > highestVal) {
      highestVal = r.score10;
      highest = p;
    }
    if (r.score10 < lowestVal) {
      lowestVal = r.score10;
      lowest = p;
    }
  }
  const score10 = Math.round((weighted / totalWeight) * 10) / 10;

  // Si todas son iguales, no destacamos high/low
  if (highestVal === lowestVal) {
    return { score10, contributing: entries.length, highest: null, lowest: null };
  }
  return {
    score10,
    contributing: entries.length,
    highest,
    lowest,
  };
}

// Card grande con el promedio ponderado. Se renderiza arriba del grid
// de cards individuales en la página detalle.
export async function RatingsAverage({ ratings }: { ratings: RatingsResponse }) {
  const t = await getTranslations("ratings");
  const avg = computeWeightedAverage(ratings);

  if (!avg) return null;

  // Color del card según rango
  const color =
    avg.score10 >= 7.5
      ? "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30"
      : avg.score10 >= 5
        ? "from-amber-500/20 to-amber-500/5 border-amber-500/30"
        : "from-rose-500/20 to-rose-500/5 border-rose-500/30";

  const scoreColor =
    avg.score10 >= 7.5
      ? "text-emerald-400"
      : avg.score10 >= 5
        ? "text-amber-400"
        : "text-rose-400";

  return (
    <Card
      className={`mb-3 p-4 sm:p-5 bg-gradient-to-br ${color} flex items-center gap-4`}
    >
      <Award className={`size-8 sm:size-10 ${scoreColor} shrink-0`} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("weightedAverage")}
        </div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className={`text-4xl sm:text-5xl font-bold tabular-nums ${scoreColor}`}>
            {avg.score10.toFixed(1)}
          </span>
          <span className="text-base text-muted-foreground">/10</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {t("averageHint", { count: avg.contributing })}
        </div>
      </div>
    </Card>
  );
}
