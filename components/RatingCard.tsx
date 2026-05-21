import { ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PlatformRating } from "@/types/movie";

export type Platform =
  | "imdb"
  | "rt"
  | "metacritic"
  | "tmdb"
  | "letterboxd"
  | "filmaffinity";

type PlatformMeta = {
  accent: string; // tailwind text color para el nombre
  // Si el rating natural es 0-100 (RT, Metacritic) mostramos /100,
  // si es 0-10 (IMDb, TMDB, Letterboxd, Filmaffinity) mostramos /10.
  unit: "/10" | "/100";
};

const PLATFORM_META: Record<Platform, PlatformMeta> = {
  imdb: { accent: "text-yellow-400", unit: "/10" },
  rt: { accent: "text-red-400", unit: "/100" },
  metacritic: { accent: "text-emerald-400", unit: "/100" },
  tmdb: { accent: "text-sky-400", unit: "/10" },
  letterboxd: { accent: "text-orange-400", unit: "/10" },
  filmaffinity: { accent: "text-blue-400", unit: "/10" },
};

function formatNumberLocale(
  n: number,
  decimals: number,
  locale: string
): string {
  return n.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function RatingCard({
  platform,
  rating,
}: {
  platform: Platform;
  rating: PlatformRating | null;
}) {
  const meta = PLATFORM_META[platform];
  const tRatings = useTranslations("ratings");
  const locale = useLocale();
  const platformName = tRatings(platform);
  const emptyMessage = tRatings(`empty.${platform}` as never) as string;

  if (!rating) {
    return (
      <Card className="p-4 flex flex-col gap-2 min-h-[112px]">
        <div
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            meta.accent
          )}
        >
          {platformName}
        </div>
        <div className="flex-1 flex items-center">
          <span className="text-sm text-muted-foreground italic">
            {emptyMessage}
          </span>
        </div>
      </Card>
    );
  }

  const displayScore =
    meta.unit === "/10"
      ? formatNumberLocale(rating.score10, 1, locale)
      : String(rating.score100);

  const Wrapper = rating.url ? "a" : "div";
  const wrapperProps = rating.url
    ? {
        href: rating.url,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "group",
      }
    : {};

  let votesText: string | null = null;
  if (rating.votes !== undefined) {
    if (rating.votes >= 1_000_000) {
      votesText = tRatings("votesMillions", {
        count: (rating.votes / 1_000_000).toFixed(1),
      });
    } else if (rating.votes >= 1_000) {
      votesText = tRatings("votesThousands", {
        count: Math.round(rating.votes / 1_000),
      });
    } else {
      votesText = tRatings("votesCount", { count: rating.votes });
    }
  }

  return (
    <Wrapper {...wrapperProps}>
      <Card
        className={cn(
          "p-4 flex flex-col gap-2 min-h-[112px] h-full",
          rating.url &&
            "transition-colors group-hover:bg-accent group-hover:text-accent-foreground cursor-pointer"
        )}
      >
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              meta.accent
            )}
          >
            {platformName}
          </div>
          {rating.url && (
            <ExternalLink className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tabular-nums">{displayScore}</span>
          <span className="text-sm text-muted-foreground">{meta.unit}</span>
        </div>

        {votesText && (
          <div className="text-xs text-muted-foreground">{votesText}</div>
        )}
      </Card>
    </Wrapper>
  );
}
