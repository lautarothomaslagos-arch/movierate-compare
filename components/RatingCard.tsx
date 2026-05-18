import { ExternalLink } from "lucide-react";
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
  name: string;
  accent: string; // tailwind text color para el nombre
  // Si el rating natural es 0-100 (RT, Metacritic) mostramos /100,
  // si es 0-10 (IMDb, TMDB, Letterboxd, Filmaffinity) mostramos /10.
  unit: "/10" | "/100";
  // Mensaje cuando la fuente no devolvió rating (con onda, en vez de "No disponible").
  emptyMessage: string;
};

const PLATFORM_META: Record<Platform, PlatformMeta> = {
  imdb: {
    name: "IMDb",
    accent: "text-yellow-400",
    unit: "/10",
    emptyMessage: "Sin estrellas todavía",
  },
  rt: {
    name: "Rotten Tomatoes",
    accent: "text-red-400",
    unit: "/100",
    emptyMessage: "El tomate no maduró",
  },
  metacritic: {
    name: "Metacritic",
    accent: "text-emerald-400",
    unit: "/100",
    emptyMessage: "Metacritic se tomó el día",
  },
  tmdb: {
    name: "TMDB",
    accent: "text-sky-400",
    unit: "/10",
    emptyMessage: "Sin puntaje aún",
  },
  letterboxd: {
    name: "Letterboxd",
    accent: "text-orange-400",
    unit: "/10",
    emptyMessage: "Letterboxd no respondió",
  },
  filmaffinity: {
    name: "Filmaffinity",
    accent: "text-blue-400",
    unit: "/10",
    emptyMessage: "Filmaffinity nos baneó (no es joda)",
  },
};

function formatNumber(n: number, decimals: number): string {
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatVotes(votes: number): string {
  if (votes >= 1_000_000) return `${(votes / 1_000_000).toFixed(1)}M votos`;
  if (votes >= 1_000) return `${Math.round(votes / 1_000)}k votos`;
  return `${votes} votos`;
}

export function RatingCard({
  platform,
  rating,
}: {
  platform: Platform;
  rating: PlatformRating | null;
}) {
  const meta = PLATFORM_META[platform];

  if (!rating) {
    return (
      <Card className="p-4 flex flex-col gap-2 min-h-[112px]">
        <div
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            meta.accent
          )}
        >
          {meta.name}
        </div>
        <div className="flex-1 flex items-center">
          <span className="text-sm text-muted-foreground italic">
            {meta.emptyMessage}
          </span>
        </div>
      </Card>
    );
  }

  const displayScore =
    meta.unit === "/10"
      ? formatNumber(rating.score10, 1)
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
            {meta.name}
          </div>
          {rating.url && (
            <ExternalLink className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tabular-nums">{displayScore}</span>
          <span className="text-sm text-muted-foreground">{meta.unit}</span>
        </div>

        {rating.votes !== undefined && (
          <div className="text-xs text-muted-foreground">
            {formatVotes(rating.votes)}
          </div>
        )}
      </Card>
    </Wrapper>
  );
}
