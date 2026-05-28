import { Film } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getTvRecommendations, getYear } from "@/lib/tmdb";

// Grid horizontal scrollable de series similares.
export async function TvRecommendationsSection({ tvId }: { tvId: number }) {
  const t = await getTranslations("tv");
  let items: Array<{
    id: number;
    name: string;
    year: number | null;
    poster_path: string | null;
  }> = [];

  try {
    const data = await getTvRecommendations(tvId);
    items = data.results.slice(0, 12).map((r) => ({
      id: r.id,
      name: r.name,
      year: getYear(r.first_air_date),
      poster_path: r.poster_path ?? null,
    }));
  } catch (err) {
    console.error("[TvRecommendations] failed:", err);
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("noSimilar")}</p>
    );
  }

  return (
    <div className="relative">
      <ul
        className={cn(
          "flex gap-3 overflow-x-auto pb-2",
          "[scroll-snap-type:x_proximity] md:[scroll-snap-type:x_mandatory]",
          "scroll-smooth -mx-4 sm:mx-0 px-4 sm:px-0"
        )}
        style={{ scrollbarWidth: "thin" }}
      >
        {items.map((t) => (
          <li
            key={t.id}
            className="shrink-0 w-32 sm:w-36 md:w-40 snap-start"
          >
            <Link
              href={`/serie/${t.id}`}
              className="group/card block"
              prefetch={false}
            >
              <div className="relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border transition-all duration-200 group-hover/card:-translate-y-1 group-hover/card:ring-2 group-hover/card:ring-primary/60 group-hover/card:shadow-[var(--shadow-1)]">
                {t.poster_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w342${t.poster_path}`}
                    alt={`Poster de ${t.name}`}
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
                {t.name}
              </div>
              {t.year !== null && (
                <div className="text-xs text-muted-foreground">{t.year}</div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TvRecommendationsSkeleton({ count = 6 }: { count?: number }) {
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
