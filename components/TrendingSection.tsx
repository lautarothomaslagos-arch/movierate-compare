import { Film } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getTrending, getYear } from "@/lib/tmdb";

type TrendingItem = {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
};

export async function TrendingSection({ limit = 12 }: { limit?: number }) {
  let items: TrendingItem[] = [];
  try {
    const trending = await getTrending("day");
    items = trending.results
      .filter(
        (r): r is Extract<typeof r, { media_type: "movie" | "tv" }> =>
          r.media_type === "movie" || r.media_type === "tv"
      )
      .slice(0, limit)
      .map((r) => {
        if (r.media_type === "movie") {
          return {
            id: r.id,
            media_type: "movie",
            title: r.title,
            year: getYear(r.release_date),
            poster_path: r.poster_path ?? null,
          };
        }
        return {
          id: r.id,
          media_type: "tv",
          title: r.name,
          year: getYear(r.first_air_date),
          poster_path: r.poster_path ?? null,
        };
      });
  } catch (err) {
    console.warn("[TrendingSection] failed:", err);
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No se pudieron cargar las tendencias.
      </p>
    );
  }

  return (
    <ul
      className={cn(
        "flex gap-3 overflow-x-auto pb-2",
        "[scroll-snap-type:x_proximity] md:[scroll-snap-type:x_mandatory]",
        "scroll-smooth -mx-4 sm:mx-0 px-4 sm:px-0"
      )}
      style={{ scrollbarWidth: "thin" }}
    >
      {items.map((it) => {
        const href =
          it.media_type === "tv" ? `/serie/${it.id}` : `/movie/${it.id}`;
        return (
          <li
            key={`${it.media_type}-${it.id}`}
            className="shrink-0 w-32 sm:w-36 md:w-40 snap-start"
          >
            <Link
              href={href}
              className="group block"
              prefetch={false}
            >
              <div className="relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border transition-all duration-200 group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-primary/60 group-hover:shadow-lg">
                {it.poster_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w342${it.poster_path}`}
                    alt={`Poster de ${it.title}`}
                    fill
                    sizes="(min-width: 768px) 160px, (min-width: 640px) 144px, 128px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Film className="size-8 text-muted-foreground" />
                  </div>
                )}
                <span
                  className={cn(
                    "absolute top-1.5 left-1.5 inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide shadow",
                    it.media_type === "tv"
                      ? "bg-purple-500/90 text-white"
                      : "bg-blue-500/90 text-white"
                  )}
                >
                  {it.media_type === "tv" ? "Serie" : "Peli"}
                </span>
              </div>
              <div className="mt-1.5 text-xs font-medium truncate">
                {it.title}
              </div>
              {it.year !== null && (
                <div className="text-xs text-muted-foreground">{it.year}</div>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function TrendingSectionSkeleton({ count = 6 }: { count?: number }) {
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
