import { Film } from "lucide-react";
import Image from "next/image";

import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { getUpcomingFromWatchlist } from "@/lib/upcoming";
import { cn } from "@/lib/utils";

// Presentational: carrusel horizontal de cards "próximo episodio".
// Lo extraje de UpcomingSection.tsx para poder reutilizarlo dentro del
// nuevo ContinueTabs sin la sección + header originales.

type UpcomingItem = Awaited<ReturnType<typeof getUpcomingFromWatchlist>>[number];

interface UpcomingCarouselProps {
  items: UpcomingItem[];
  labels: {
    today: string;
    tomorrow: string;
    inDays: (n: number) => string;
  };
}

export function UpcomingCarousel({ items, labels }: UpcomingCarouselProps) {
  return (
    <div className="scroll-row-x -mx-4 sm:mx-0 px-4 sm:px-0">
      {items.map((it) => (
        <UpcomingCard
          key={`${it.tmdb_id}-${it.episode.episode_number ?? 0}`}
          item={it}
          labels={labels}
        />
      ))}
    </div>
  );
}

function UpcomingCard({
  item,
  labels,
}: {
  item: UpcomingItem;
  labels: UpcomingCarouselProps["labels"];
}) {
  const poster = item.series_poster_path
    ? `https://image.tmdb.org/t/p/w342${item.series_poster_path}`
    : null;
  const ep = item.episode;
  const isToday = item.days_until === 0;
  const isTomorrow = item.days_until === 1;
  const dateLabel = isToday
    ? labels.today
    : isTomorrow
      ? labels.tomorrow
      : labels.inDays(item.days_until);

  const seasonEp =
    ep.season_number !== null && ep.episode_number !== null
      ? `S${String(ep.season_number).padStart(2, "0")}E${String(ep.episode_number).padStart(2, "0")}`
      : null;

  return (
    <Link
      href={`/serie/${item.tmdb_id}`}
      prefetch={false}
      className="shrink-0 w-40 sm:w-48 group"
    >
      <Card className="overflow-hidden ring-1 ring-border transition-all group-hover:ring-2 group-hover:ring-primary/60 group-hover:-translate-y-0.5">
        <div className="relative aspect-[2/3] bg-muted">
          {poster ? (
            <Image
              src={poster}
              alt={`Poster de ${item.series_title}`}
              fill
              sizes="(min-width: 640px) 192px, 160px"
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Film className="size-8 text-muted-foreground" />
            </div>
          )}
          <div
            className={cn(
              "absolute top-1.5 right-1.5 px-2 py-1 rounded text-[10px] font-bold shadow",
              isToday
                ? "bg-rose-500 text-white"
                : isTomorrow
                  ? "bg-amber-500 text-black"
                  : "bg-background/95 backdrop-blur text-foreground border border-border"
            )}
          >
            {dateLabel}
          </div>
        </div>
        <div className="p-2 space-y-0.5">
          <div className="text-xs font-bold truncate">{item.series_title}</div>
          {seasonEp && (
            <div className="text-[10px] font-semibold text-primary tabular-nums">
              {seasonEp}
            </div>
          )}
          {ep.name && (
            <div className="text-[11px] text-muted-foreground line-clamp-1">
              {ep.name}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
