import { RatingCard, type Platform } from "@/components/RatingCard";
import { computeWeightedAverage } from "@/components/RatingsAverage";
import { Skeleton } from "@/components/ui/skeleton";
import { getRatings } from "@/lib/ratings";

const PLATFORMS: Platform[] = ["imdb", "rt", "metacritic", "tmdb", "letterboxd"];

// El bloque del weighted average ya vive en el Billboard sobre el fold
// (Fase G.1). Acá solo mostramos los 5 boletos individuales con su
// highlight (best en brass, worst en gris) — no duplicamos el promedio.
export async function RatingsSection({ tmdbId }: { tmdbId: number }) {
  const ratings = await getRatings(tmdbId);
  const avg = computeWeightedAverage(ratings);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-3">
      {PLATFORMS.map((p) => (
        <RatingCard
          key={p}
          platform={p}
          rating={ratings[p]}
          highlight={
            avg?.highest === p
              ? "highest"
              : avg?.lowest === p
                ? "lowest"
                : null
          }
        />
      ))}
    </div>
  );
}

export function RatingsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-3">
      {PLATFORMS.map((p) => (
        <Skeleton key={p} className="h-[110px] rounded-md" />
      ))}
    </div>
  );
}
