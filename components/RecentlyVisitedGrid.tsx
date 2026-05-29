import { Film } from "lucide-react";
import Image from "next/image";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type RecentItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
};

export function RecentlyVisitedGrid({ items }: { items: RecentItem[] }) {
  return (
    <ul
      className={cn(
        "flex gap-3 overflow-x-auto pb-2",
        "[scroll-snap-type:x_proximity] md:[scroll-snap-type:x_mandatory]",
        "scroll-smooth -mx-4 sm:mx-0 px-4 sm:px-0"
      )}
      style={{ scrollbarWidth: "thin" }}
    >
      {items.map((item) => {
        const href =
          item.media_type === "tv"
            ? `/serie/${item.tmdb_id}`
            : `/movie/${item.tmdb_id}`;
        return (
          <li
            key={`${item.media_type}-${item.tmdb_id}`}
            className="shrink-0 w-32 sm:w-36 md:w-40 snap-start"
          >
            <Link
              href={href}
              className="group block"
              prefetch={false}
            >
              <div className="poster-frame relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border group-hover:ring-primary/60">
                {item.poster_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                    alt={`Poster de ${item.title}`}
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
                {item.title}
              </div>
              {item.year !== null && (
                <div className="text-xs text-muted-foreground">{item.year}</div>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
