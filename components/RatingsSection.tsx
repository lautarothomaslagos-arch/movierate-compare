import { RatingCard, type Platform } from "@/components/RatingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getRatings } from "@/lib/ratings";

const PLATFORMS: Platform[] = ["imdb", "rt", "metacritic", "tmdb", "letterboxd"];

// Server Component async — Next lo streamea con Suspense desde la página padre.
export async function RatingsSection({ tmdbId }: { tmdbId: number }) {
  const ratings = await getRatings(tmdbId);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {PLATFORMS.map((p) => (
        <RatingCard key={p} platform={p} rating={ratings[p]} />
      ))}
    </div>
  );
}

export function RatingsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {PLATFORMS.map((p) => (
        <Skeleton key={p} className="h-[112px] rounded-xl" />
      ))}
    </div>
  );
}
