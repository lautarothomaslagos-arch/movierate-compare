import Image from "next/image";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { backdropUrl, getMovieImages, getTvImages } from "@/lib/tmdb";

// Server Component. Devuelve hasta 8 backdrops alternativos en grid horizontal
// scrollable. Si no hay imágenes, devuelve null (la página padre lo oculta).
export async function ImageGallery({
  tmdbId,
  mediaType = "movie",
  limit = 8,
}: {
  tmdbId: number;
  mediaType?: "movie" | "tv";
  limit?: number;
}) {
  let backdrops: Array<{ file_path: string }> = [];
  try {
    const data =
      mediaType === "tv"
        ? await getTvImages(tmdbId)
        : await getMovieImages(tmdbId);
    backdrops = (data.backdrops ?? []).slice(0, limit);
  } catch (err) {
    console.warn("[ImageGallery] failed:", err);
    return null;
  }

  if (backdrops.length === 0) return null;

  return (
    <ul
      className={cn(
        "flex gap-3 overflow-x-auto pb-2",
        "[scroll-snap-type:x_proximity] md:[scroll-snap-type:x_mandatory]",
        "scroll-smooth -mx-4 sm:mx-0 px-4 sm:px-0"
      )}
      style={{ scrollbarWidth: "thin" }}
    >
      {backdrops.map((b, i) => {
        const src = backdropUrl(b.file_path, "w780");
        if (!src) return null;
        return (
          <li
            key={b.file_path}
            className="shrink-0 w-72 sm:w-80 md:w-96 snap-start"
          >
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden ring-1 ring-border">
              <Image
                src={src}
                alt={`Imagen ${i + 1}`}
                fill
                sizes="(min-width: 768px) 384px, (min-width: 640px) 320px, 288px"
                className="object-cover"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ImageGallerySkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-hidden pb-2">
      <div className="flex gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton
            key={i}
            className="shrink-0 w-72 sm:w-80 md:w-96 aspect-video rounded-lg"
          />
        ))}
      </div>
    </div>
  );
}
