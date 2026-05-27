import { CalendarClock } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { processNextEpisode } from "@/lib/upcoming";
import { cn } from "@/lib/utils";

// Banner que se muestra en /serie/[id] si la serie tiene next_episode_to_air
// en los próximos 7 días. Si no aplica, devuelve null y la página no
// renderiza nada.
export async function UpcomingEpisodeBanner({
  nextEpisode,
}: {
  nextEpisode:
    | {
        name?: string | null;
        air_date?: string | null;
        episode_number?: number | null;
        season_number?: number | null;
      }
    | null
    | undefined;
}) {
  const processed = processNextEpisode(nextEpisode, 7);
  if (!processed) return null;

  const t = await getTranslations("upcoming");

  const isToday = processed.days_until === 0;
  const isTomorrow = processed.days_until === 1;
  const dateLabel = isToday
    ? t("today")
    : isTomorrow
      ? t("tomorrow")
      : t("inDays", { n: processed.days_until });

  const seasonEp =
    processed.season_number !== null && processed.episode_number !== null
      ? `S${String(processed.season_number).padStart(2, "0")}E${String(processed.episode_number).padStart(2, "0")}`
      : null;

  // Formato fecha en locale del request
  const formattedDate = new Date(
    processed.air_date + "T00:00:00Z"
  ).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div
      className={cn(
        "rounded-lg p-3 sm:p-4 flex items-start gap-3 ring-1",
        isToday
          ? "bg-rose-500/10 ring-rose-500/40"
          : isTomorrow
            ? "bg-amber-500/10 ring-amber-500/40"
            : "bg-primary/5 ring-primary/30"
      )}
    >
      <div
        className={cn(
          "shrink-0 rounded-full p-2",
          isToday
            ? "bg-rose-500/20 text-rose-400"
            : isTomorrow
              ? "bg-amber-500/20 text-amber-500"
              : "bg-primary/15 text-primary"
        )}
      >
        <CalendarClock className="size-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("bannerLabel")}
          </span>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-bold",
              isToday
                ? "bg-rose-500 text-white"
                : isTomorrow
                  ? "bg-amber-500 text-black"
                  : "bg-primary text-primary-foreground"
            )}
          >
            {dateLabel}
          </span>
          {seasonEp && (
            <span className="text-[11px] font-semibold text-primary tabular-nums">
              {seasonEp}
            </span>
          )}
        </div>
        {processed.name && (
          <h3 className="text-sm sm:text-base font-semibold mt-1 truncate">
            {processed.name}
          </h3>
        )}
        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
          {formattedDate}
        </p>
      </div>
    </div>
  );
}
