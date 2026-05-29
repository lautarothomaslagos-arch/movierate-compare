import { Film, Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { getCollection, getYear, posterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

// Para pelis que son parte de una saga (Toy Story 1+2+3+4, Marvel, etc.).
// Si TMDB no tiene info de la colección o falla, devuelve null.
export async function CollectionSection({
  collectionId,
  currentMovieId,
}: {
  collectionId: number;
  currentMovieId: number;
}) {
  const t = await getTranslations("saga");

  let collection;
  try {
    collection = await getCollection(collectionId);
  } catch (err) {
    console.warn("[CollectionSection] failed:", err);
    return null;
  }

  // Ordenamos por fecha de estreno (las pelis con fecha primero)
  const parts = [...collection.parts].sort((a, b) => {
    const yearA = getYear(a.release_date);
    const yearB = getYear(b.release_date);
    if (yearA === null) return 1;
    if (yearB === null) return -1;
    return yearA - yearB;
  });

  if (parts.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">
          {t("partOf", { name: collection.name })}
        </h3>
      </div>

      <ul className="scroll-row-x -mx-4 sm:mx-0 px-4 sm:px-0">
        {parts.map((part) => {
          const isCurrent = part.id === currentMovieId;
          const year = getYear(part.release_date);
          const poster = posterUrl(part.poster_path, "w342");
          return (
            <li
              key={part.id}
              className="shrink-0 w-28 sm:w-32 md:w-36 snap-start"
            >
              <Link
                href={`/movie/${part.id}`}
                className={cn(
                  "group block",
                  isCurrent && "pointer-events-none"
                )}
                prefetch={false}
              >
                <div
                  className={cn(
                    "relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border transition-all",
                    !isCurrent &&
                      "group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-primary/60",
                    isCurrent && "ring-2 ring-primary"
                  )}
                >
                  {poster ? (
                    <Image
                      src={poster}
                      alt={`Poster de ${part.title}`}
                      fill
                      sizes="(min-width: 768px) 144px, (min-width: 640px) 128px, 112px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Film className="size-6 text-muted-foreground" />
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-primary text-primary-foreground">
                      Actual
                    </div>
                  )}
                </div>
                <div className="mt-1.5 text-xs font-medium truncate">
                  {part.title}
                </div>
                {year !== null && (
                  <div className="text-xs text-muted-foreground">{year}</div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function CollectionSkeleton() {
  return (
    <Card className="p-4">
      <Skeleton className="h-4 w-40 mb-3" />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shrink-0 w-28 sm:w-32 md:w-36">
            <Skeleton className="aspect-[2/3] rounded-md" />
            <Skeleton className="mt-1.5 h-3 w-3/4" />
          </div>
        ))}
      </div>
    </Card>
  );
}
