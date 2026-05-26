import { RatingCard, type Platform } from "@/components/RatingCard";
import {
  RatingsAverage,
  computeWeightedAverage,
} from "@/components/RatingsAverage";
import { Skeleton } from "@/components/ui/skeleton";
import { getRatings } from "@/lib/ratings";

const PLATFORMS: Platform[] = ["imdb", "rt", "metacritic", "tmdb", "letterboxd"];

export async function RatingsSection({ tmdbId }: { tmdbId: number }) {
  const ratings = await getRatings(tmdbId);
  const avg = computeWeightedAverage(ratings);

  return (
    <div>
      <RatingsAverage ratings={ratings} />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
    </div>
  );
}

export function RatingsSkeleton() {
  return (
    <div>
      <Skeleton className="h-24 w-full rounded-xl mb-3" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {PLATFORMS.map((p) => (
          <Skeleton key={p} className="h-[112px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
