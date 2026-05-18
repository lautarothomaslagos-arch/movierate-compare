import { Film } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";

export type GridMovie = {
  id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
};

// Grid horizontal scrollable (mobile + desktop) — un row con scroll-snap.
// Pensado para "Similares" en la página de detalle.
export function MovieGrid({ movies }: { movies: GridMovie[] }) {
  if (movies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin recomendaciones para esta película.
      </p>
    );
  }

  return (
    <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto pb-2">
      <ul className="flex gap-3 snap-x snap-mandatory">
        {movies.map((m) => (
          <li
            key={m.id}
            className="shrink-0 w-32 sm:w-36 md:w-40 snap-start"
          >
            <Link
              href={`/movie/${m.id}`}
              className="group block"
              prefetch={false}
            >
              <div className="relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border transition-transform group-hover:-translate-y-0.5 group-hover:ring-2 group-hover:ring-primary/60">
                {m.poster_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                    alt={`Poster de ${m.title}`}
                    fill
                    sizes="(min-width: 768px) 160px, (min-width: 640px) 144px, 128px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Film className="size-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="mt-1.5 text-xs font-medium truncate">
                {m.title}
              </div>
              {m.year !== null && (
                <div className="text-xs text-muted-foreground">{m.year}</div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MovieGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-hidden pb-2">
      <div className="flex gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="shrink-0 w-32 sm:w-36 md:w-40">
            <Skeleton className="aspect-[2/3] rounded-md" />
            <Skeleton className="mt-1.5 h-3 w-3/4" />
            <Skeleton className="mt-1 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
