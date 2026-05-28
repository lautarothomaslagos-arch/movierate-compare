import { ExternalLink, Trophy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { PlatformRating } from "@/types/movie";

export type RatingHighlight = "highest" | "lowest" | null;

export type Platform =
  | "imdb"
  | "rt"
  | "metacritic"
  | "tmdb"
  | "letterboxd";

// Boleto de cine: marca como sello mono pequeño arriba, número en serif
// italic grande, escala en mono dim, votos al pie. Color de la fuente vive
// en una franja vertical de 3px a la izquierda — acento, no fondo.
// Reemplaza la card vieja con 5 logos a color a saturación alta.
type PlatformMeta = {
  // CSS var del color de la fuente (definida en globals.css)
  stripeVar: string;
  textColor: string;
  // /10 o /100 según escala natural
  unit: "/10" | "/100";
};

const PLATFORM_META: Record<Platform, PlatformMeta> = {
  imdb: {
    stripeVar: "var(--imdb)",
    textColor: "text-[var(--imdb)]",
    unit: "/10",
  },
  rt: {
    stripeVar: "var(--rt)",
    textColor: "text-[var(--rt)]",
    unit: "/100",
  },
  metacritic: {
    stripeVar: "var(--metac)",
    textColor: "text-[var(--metac)]",
    unit: "/100",
  },
  tmdb: {
    stripeVar: "var(--tmdb)",
    textColor: "text-[var(--tmdb)]",
    unit: "/10",
  },
  letterboxd: {
    stripeVar: "var(--lbox-g)",
    textColor: "text-[var(--lbox-g)]",
    unit: "/10",
  },
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
  highlight = null,
}: {
  platform: Platform;
  rating: PlatformRating | null;
  highlight?: RatingHighlight;
}) {
  const meta = PLATFORM_META[platform];
  const tRatings = useTranslations("ratings");
  const locale = useLocale();
  const platformName = tRatings(platform);
  const emptyMessage = tRatings(`empty.${platform}` as never) as string;

  // Empty state: boleto en gris claro con mensaje ingenioso
  if (!rating) {
    return (
      <article
        className={cn(
          "relative rounded-md border border-dashed border-border bg-muted/30",
          "px-3 py-3.5 min-h-[110px] flex flex-col gap-2 opacity-70 hover:opacity-90",
          "transition-opacity overflow-hidden"
        )}
      >
        <span
          aria-hidden
          className="absolute left-0 inset-y-2 w-[3px] rounded-sm opacity-50"
          style={{ background: meta.stripeVar }}
        />
        <p
          className={cn(
            "font-mono text-[9px] uppercase tracking-[0.18em]",
            meta.textColor
          )}
        >
          {platformName}
        </p>
        <p className="text-xs text-muted-foreground italic leading-snug">
          {emptyMessage}
        </p>
      </article>
    );
  }

  const displayScore =
    meta.unit === "/10"
      ? formatNumberLocale(rating.score10, 1, locale)
      : String(rating.score100);

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

  const Wrapper = rating.url ? "a" : "div";
  const wrapperProps = rating.url
    ? {
        href: rating.url,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "group block",
      }
    : { className: "block" };

  return (
    <Wrapper {...wrapperProps}>
      <article
        className={cn(
          "relative rounded-md border bg-card px-3 py-3.5 min-h-[110px] overflow-hidden",
          "transition-transform duration-200",
          // Micro rotate al hover — sutil, le da identidad de boleto impreso
          rating.url &&
            "group-hover:-rotate-[0.4deg] group-hover:-translate-y-px group-hover:shadow-[var(--shadow-1)] cursor-pointer",
          // Highlight: best en brass, worst en gris
          highlight === "highest" && "border-primary/50",
          highlight === "lowest" && "border-border opacity-90",
          highlight === null && "border-border"
        )}
      >
        {/* Franja vertical lateral con color de la fuente — acento, no fondo */}
        <span
          aria-hidden
          className="absolute left-0 inset-y-2 w-[3px] rounded-sm"
          style={{ background: meta.stripeVar }}
        />

        {/* Trophy badge si es el best */}
        {highlight === "highest" && (
          <Trophy
            className="absolute top-2 right-2 size-3.5 text-primary"
            aria-label="Mejor puntuada"
          />
        )}

        {/* External link icon si tiene url, solo en hover */}
        {rating.url && highlight !== "highest" && (
          <ExternalLink
            className="absolute top-2.5 right-2.5 size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            aria-hidden
          />
        )}

        <p
          className={cn(
            "font-mono text-[9px] uppercase tracking-[0.18em] mb-1",
            meta.textColor
          )}
        >
          {platformName}
        </p>

        <p
          className={cn(
            "font-serif italic font-normal text-3xl leading-none tabular-nums",
            highlight === "highest" && "text-primary",
            highlight === "lowest" && "text-muted-foreground"
          )}
        >
          {displayScore}
          <span className="font-mono not-italic text-[10px] text-muted-foreground ml-0.5 tracking-normal">
            {" "}
            {meta.unit}
          </span>
        </p>

        <p className="font-mono text-[9px] text-muted-foreground/80 tracking-[0.04em] mt-2.5">
          {votesText ?? "—"}
        </p>
      </article>
    </Wrapper>
  );
}
