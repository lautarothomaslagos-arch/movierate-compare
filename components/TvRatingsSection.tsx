import { RatingCard, type Platform } from "@/components/RatingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getTvRatings } from "@/lib/tv-ratings";

// Para series mostramos solo las plataformas que tienen sentido.
// Letterboxd y Filmaffinity NO van (Letterboxd no indexa series, Filmaffinity
// está bloqueado igual que en pelis).
const TV_PLATFORMS: Platform[] = ["imdb", "rt", "metacritic", "tmdb"];

export async function TvRatingsSection({ tvId }: { tvId: number }) {
  const ratings = await getTvRatings(tvId);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {TV_PLATFORMS.map((p) => (
        <RatingCard key={p} platform={p} rating={ratings[p]} />
      ))}
    </div>
  );
}

export function TvRatingsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {TV_PLATFORMS.map((p) => (
        <Skeleton key={p} className="h-[112px] rounded-xl" />
      ))}
    </div>
  );
}
