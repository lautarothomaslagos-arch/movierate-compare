import { CalendarClock, Film } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getUpcomingFromWatchlist } from "@/lib/upcoming";
import { cn } from "@/lib/utils";

// Sección "Próximo en tu lista" para home. Solo se renderiza si hay items.
// Server component — si user no está logueado, watchlist viene vacía y se
// resuelve a null (la home no muestra nada).
export async function UpcomingSection() {
  const t = await getTranslations("upcoming");
  const items = await getUpcomingFromWatchlist(14);
  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-end justify-between mb-3 px-1">
        <div>
          <h2 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight tracking-tight inline-flex items-baseline gap-2">
            <CalendarClock className="size-5 text-primary self-center" />
            {t("homeHeading")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("homeSubtitle")}
          </p>
        </div>
      </div>
      <div className="scroll-row-x -mx-4 sm:mx-0 px-4 sm:px-0">
        {items.map((it) => (
          <UpcomingCard key={`${it.tmdb_id}-${it.episode.episode_number ?? 0}`} item={it} t={t} />
        ))}
      </div>
    </section>
  );
}

function UpcomingCard({
  item,
  t,
}: {
  item: Awaited<ReturnType<typeof getUpcomingFromWatchlist>>[number];
  t: Awaited<ReturnType<typeof getTranslations<"upcoming">>>;
}) {
  const poster = item.series_poster_path
    ? `https://image.tmdb.org/t/p/w342${item.series_poster_path}`
    : null;
  const ep = item.episode;
  const isToday = item.days_until === 0;
  const isTomorrow = item.days_until === 1;
  const dateLabel = isToday
    ? t("today")
    : isTomorrow
      ? t("tomorrow")
      : t("inDays", { n: item.days_until });

  // SxxExx label si tenemos ambos números
  const seasonEp =
    ep.season_number !== null && ep.episode_number !== null
      ? `S${String(ep.season_number).padStart(2, "0")}E${String(ep.episode_number).padStart(2, "0")}`
      : null;

  return (
    <Link
      href={`/serie/${item.tmdb_id}`}
      prefetch={false}
      className="shrink-0 w-44 sm:w-52 group"
    >
      <Card className="overflow-hidden ring-1 ring-border transition-all group-hover:ring-2 group-hover:ring-primary/60 group-hover:-translate-y-0.5">
        <div className="relative aspect-[2/3] bg-muted">
          {poster ? (
            <Image
              src={poster}
              alt={`Poster de ${item.series_title}`}
              fill
              sizes="(min-width: 640px) 208px, 176px"
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Film className="size-8 text-muted-foreground" />
            </div>
          )}
          {/* Badge de countdown esquina superior */}
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
        <div className="p-2.5 space-y-1">
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
