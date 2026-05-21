import { PlayCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Skeleton } from "@/components/ui/skeleton";
import { getMovieVideos, getTvVideos } from "@/lib/tmdb";
import type { TmdbVideo } from "@/types/movie";

// Server Component que embeebe el trailer principal en YouTube.
// Heurística para elegir el "mejor" video:
// 1. Tipo "Trailer", official=true
// 2. Si no, tipo "Trailer" cualquiera
// 3. Si no, primer video tipo "Teaser"
// 4. Si no, cualquier video de YouTube
function pickBestVideo(videos: TmdbVideo[]): TmdbVideo | null {
  const youtube = videos.filter((v) => v.site === "YouTube");
  if (youtube.length === 0) return null;

  const trailerOfficial = youtube.find(
    (v) => v.type === "Trailer" && v.official
  );
  if (trailerOfficial) return trailerOfficial;

  const trailer = youtube.find((v) => v.type === "Trailer");
  if (trailer) return trailer;

  const teaser = youtube.find((v) => v.type === "Teaser");
  if (teaser) return teaser;

  return youtube[0];
}

export async function TrailerSection({
  tmdbId,
  mediaType = "movie",
}: {
  tmdbId: number;
  mediaType?: "movie" | "tv";
}) {
  let videos: TmdbVideo[] = [];
  try {
    const data =
      mediaType === "tv"
        ? await getTvVideos(tmdbId)
        : await getMovieVideos(tmdbId);
    videos = data.results;
  } catch (err) {
    console.warn("[TrailerSection] failed:", err);
    return null;
  }

  const best = pickBestVideo(videos);
  if (!best) return null;

  const t = await getTranslations();
  void t; // silencio el unused — lo dejo para futuras strings

  return (
    <div className="space-y-2">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden ring-1 ring-border">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${best.key}?rel=0&modestbranding=1`}
          title={best.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          loading="lazy"
        />
      </div>
      <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <PlayCircle className="size-3" />
        {best.name}
        {best.type !== "Trailer" && (
          <span className="opacity-60">· {best.type}</span>
        )}
      </p>
    </div>
  );
}

export function TrailerSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-video w-full rounded-lg" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}
