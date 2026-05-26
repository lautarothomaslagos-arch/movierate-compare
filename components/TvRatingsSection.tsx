import { RatingCard, type Platform } from "@/components/RatingCard";
import {
  RatingsAverage,
  computeWeightedAverage,
} from "@/components/RatingsAverage";
import { Skeleton } from "@/components/ui/skeleton";
import { getTvRatings } from "@/lib/tv-ratings";

const TV_PLATFORMS: Platform[] = ["imdb", "rt", "metacritic", "tmdb"];

export async function TvRatingsSection({ tvId }: { tvId: number }) {
  const ratings = await getTvRatings(tvId);
  const avg = computeWeightedAverage(ratings);

  return (
    <div>
      <RatingsAverage ratings={ratings} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
    </div>
  );
}

export function TvRatingsSkeleton() {
  return (
    <div>
      <Skeleton className="h-24 w-full rounded-xl mb-3" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TV_PLATFORMS.map((p) => (
          <Skeleton key={p} className="h-[112px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
