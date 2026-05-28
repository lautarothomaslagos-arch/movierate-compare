import { RatingCard, type Platform } from "@/components/RatingCard";
import { computeWeightedAverage } from "@/components/RatingsAverage";
import { Skeleton } from "@/components/ui/skeleton";
import { getTvRatings } from "@/lib/tv-ratings";

const TV_PLATFORMS: Platform[] = ["imdb", "rt", "metacritic", "tmdb"];

// El weighted avg ya vive en el Billboard sobre el fold (Fase G.1).
// Acá solo los 4 boletos individuales (TV no usa Letterboxd).
export async function TvRatingsSection({ tvId }: { tvId: number }) {
  const ratings = await getTvRatings(tvId);
  const avg = computeWeightedAverage(ratings);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
      {TV_PLATFORMS.map((p) => (
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

export function TvRatingsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
      {TV_PLATFORMS.map((p) => (
        <Skeleton key={p} className="h-[110px] rounded-md" />
      ))}
    </div>
  );
}
