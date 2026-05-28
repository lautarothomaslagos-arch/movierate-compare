import { ArrowLeft, Crown, Film, Minus, Tv, X } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";

import { RadarChart } from "@/components/RadarChart";
import { computeWeightedAverage } from "@/components/RatingsAverage";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import {
  fetchComparable,
  parseCompareKey,
  type ComparableItem,
} from "@/lib/compare";
import { genreBadgeClass } from "@/lib/genre-colors";
import { cn } from "@/lib/utils";
import type { PlatformRating, RatingsResponse } from "@/types/movie";

type RatingKey = keyof Pick<
  RatingsResponse,
  "imdb" | "rt" | "metacritic" | "tmdb" | "letterboxd"
>;

// Hasta 4 items: a, b, c, d. Mínimo 2 para mostrar la comparación.
type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ a?: string; b?: string; c?: string; d?: string }>;
};

// Paleta para los datasets del radar (orden = a, b, c, d).
// Elegidos para tener contraste alto en dark y light.
const ITEM_COLORS: { hex: string; ringClass: string }[] = [
  { hex: "#3b82f6", ringClass: "ring-blue-500" }, // blue-500
  { hex: "#f59e0b", ringClass: "ring-amber-500" }, // amber-500
  { hex: "#a855f7", ringClass: "ring-purple-500" }, // purple-500
  { hex: "#10b981", ringClass: "ring-emerald-500" }, // emerald-500
];

export async function generateMetadata({ searchParams }: Props) {
  const { a, b } = await searchParams;
  if (!a || !b) return { title: "Comparar — MovieRate Compare" };
  return {
    title: "Comparar — MovieRate Compare",
    description: "Compará pelis o series lado a lado por sus ratings.",
  };
}

export default async function CompararPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("compare");
  const tRatings = await getTranslations("ratings");
  const { a, b, c, d } = await searchParams;

  // Parseamos hasta 4 keys. parseCompareKey devuelve null si la string es
  // inválida — la filtramos.
  const rawKeys = [a, b, c, d];
  const parsedKeys = rawKeys
    .map((k) => parseCompareKey(k))
    .filter((k): k is NonNullable<ReturnType<typeof parseCompareKey>> => k !== null);

  // Si hay menos de 2, mostramos UI de "elegí desde la página"
  if (parsedKeys.length < 2) {
    return (
      <main className="px-4 sm:px-6 py-12 max-w-3xl mx-auto w-full text-center">
        <h1 className="font-serif italic font-normal text-4xl sm:text-5xl leading-[0.95] tracking-tight text-balance">
          {t("heading")}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          {t("subtitle")}
        </p>
        <Card className="mt-8 p-6 border-dashed">
          <p className="text-sm text-muted-foreground">
            Para comparar, andá a una peli o serie y usá el botón{" "}
            <strong>{t("compareAction")}</strong> al lado del de{" "}
            <em>compartir</em>.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 mt-4 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="size-4" />
            Volver al inicio
          </Link>
        </Card>
      </main>
    );
  }

  // Fetch en paralelo de todos los items
  let items: ComparableItem[] = [];
  try {
    items = await Promise.all(
      parsedKeys.map((k) => fetchComparable(k.mediaType, k.id))
    );
  } catch (err) {
    return (
      <main className="px-4 sm:px-6 py-12 max-w-3xl mx-auto w-full text-center">
        <h1 className="text-2xl font-bold">No se pudo cargar la comparación</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {err instanceof Error ? err.message : "Error desconocido"}
        </p>
        <Link href="/" className="inline-block mt-4 text-primary hover:underline">
          Volver
        </Link>
      </main>
    );
  }

  const n = items.length;
  const averages = items.map((it) => computeWeightedAverage(it.ratings));

  // Plataformas a comparar fila por fila
  const platforms: Array<{ key: RatingKey; label: string }> = [
    { key: "imdb", label: tRatings("imdb") },
    { key: "rt", label: tRatings("rt") },
    { key: "metacritic", label: tRatings("metacritic") },
    { key: "tmdb", label: tRatings("tmdb") },
  ];
  // Letterboxd solo si TODAS son pelis (no indexa series)
  const allMovies = items.every((i) => i.mediaType === "movie");
  if (allMovies) {
    platforms.push({ key: "letterboxd", label: tRatings("letterboxd") });
  }

  // Calcula best/worst para una lista de scores (con nulls). Retorna índices.
  function highlightIndices(scores: (number | null)[]): {
    best: Set<number>;
    worst: Set<number>;
  } {
    const present = scores
      .map((s, i) => ({ s, i }))
      .filter((x): x is { s: number; i: number } => x.s !== null);
    if (present.length < 2) return { best: new Set(), worst: new Set() };
    const max = Math.max(...present.map((p) => p.s));
    const min = Math.min(...present.map((p) => p.s));
    if (max === min) return { best: new Set(), worst: new Set() }; // todos iguales → no destacamos
    const best = new Set(
      present.filter((p) => p.s === max).map((p) => p.i)
    );
    const worst = new Set(
      present.filter((p) => p.s === min).map((p) => p.i)
    );
    return { best, worst };
  }

  // URLs de detalle por item
  function detailUrl(item: ComparableItem): string {
    return item.mediaType === "tv" ? `/serie/${item.id}` : `/movie/${item.id}`;
  }

  // Avg highlight
  const avgScores = averages.map((a) => a?.score10 ?? null);
  const avgHL = highlightIndices(avgScores);

  // Layout grid responsive según n items
  // 2 items → 2 cols siempre
  // 3 items → 3 cols en sm+, 2 cols + 1 en mobile (usa grid-cols-2/sm:grid-cols-3)
  // 4 items → 2x2 mobile, 4 cols sm+
  const gridColsClass =
    n === 2
      ? "grid-cols-2"
      : n === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-2 sm:grid-cols-4";

  // Dataset para el RadarChart: convertimos ratings[platform] de cada item
  // a un mapa key → score10. Las plataformas son las mismas axes del radar.
  const radarDatasets = items.map((it, idx) => {
    const values: Record<string, number | null> = {};
    for (const p of platforms) {
      const rating: PlatformRating | null | undefined = it.ratings[p.key];
      values[p.key] = rating?.score10 ?? null;
    }
    return {
      name: it.title,
      color: ITEM_COLORS[idx]?.ringClass ?? "ring-foreground",
      hex: ITEM_COLORS[idx]?.hex ?? "#888888",
      values,
    };
  });

  return (
    <main className="px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
      <header className="mb-6">
        <h1 className="font-serif italic font-normal text-3xl sm:text-4xl leading-[0.95] tracking-tight text-balance">
          {t("heading")}
        </h1>
        {n > 2 && (
          <p className="text-sm text-muted-foreground mt-1">
            Comparando {n} títulos
          </p>
        )}
      </header>

      {/* Top: posters + info básica de cada uno */}
      <div className={cn("grid gap-3 sm:gap-4", gridColsClass)}>
        {items.map((item, i) => (
          <ItemColumn
            key={`${item.mediaType}-${item.id}`}
            item={item}
            detailUrl={detailUrl(item)}
            color={ITEM_COLORS[i]}
          />
        ))}
      </div>

      {/* Promedio ponderado fila destacada */}
      <Card className="mt-6 p-4 sm:p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t("averageLabel")}
        </div>
        <div className={cn("grid gap-3 sm:gap-4 items-center", gridColsClass)}>
          {items.map((item, i) => (
            <ScoreCell
              key={`${item.mediaType}-${item.id}`}
              label={item.title}
              score={avgScores[i]}
              big
              highlight={
                avgHL.best.has(i)
                  ? "winner"
                  : avgHL.worst.has(i)
                    ? "loser"
                    : null
              }
            />
          ))}
        </div>
      </Card>

      {/* Radar chart de las plataformas */}
      <Card className="mt-6 p-4 sm:p-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 text-center sm:text-left">
          Radar por plataforma
        </div>
        <RadarChart
          axes={platforms.map((p) => ({ key: p.key, label: p.label }))}
          datasets={radarDatasets}
          maxValue={10}
        />
      </Card>

      {/* Tabla de ratings por plataforma */}
      <div className="mt-6 space-y-2">
        {platforms.map((p) => {
          const scores = items.map((it) => {
            const r: PlatformRating | null | undefined = it.ratings[p.key];
            return r?.score10 ?? null;
          });
          const hl = highlightIndices(scores);

          return (
            <div
              key={p.key}
              className={cn(
                "grid gap-2 sm:gap-3 items-center",
                // Label centrado entre las celdas, queda compact
                n === 2
                  ? "grid-cols-[1fr_auto_1fr] sm:grid-cols-[1fr_120px_1fr]"
                  : "grid-cols-[1fr_auto] sm:grid-cols-[auto_1fr]"
              )}
            >
              {n === 2 ? (
                // Layout especial 2-cols con label en el centro
                <>
                  <ScoreCell
                    score={scores[0]}
                    highlight={
                      hl.best.has(0)
                        ? "winner"
                        : hl.worst.has(0)
                          ? "loser"
                          : null
                    }
                    align="right"
                  />
                  <div className="text-center text-xs font-medium text-muted-foreground py-2 px-2 sm:px-4 border-y border-border/40">
                    {p.label}
                  </div>
                  <ScoreCell
                    score={scores[1]}
                    highlight={
                      hl.best.has(1)
                        ? "winner"
                        : hl.worst.has(1)
                          ? "loser"
                          : null
                    }
                    align="left"
                  />
                </>
              ) : (
                // Layout N-cols con label a la izquierda
                <>
                  <div className="text-xs font-medium text-muted-foreground py-2 px-2 sm:px-3 border-y border-border/40 whitespace-nowrap">
                    {p.label}
                  </div>
                  <div className={cn("grid gap-2 sm:gap-3 items-center", gridColsClass)}>
                    {scores.map((s, i) => (
                      <ScoreCell
                        key={i}
                        score={s}
                        highlight={
                          hl.best.has(i)
                            ? "winner"
                            : hl.worst.has(i)
                              ? "loser"
                              : null
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function ItemColumn({
  item,
  detailUrl,
  color,
}: {
  item: ComparableItem;
  detailUrl: string;
  color?: { hex: string; ringClass: string };
}) {
  return (
    <Card className={cn("p-3 sm:p-4 border-t-4")} style={
      color ? { borderTopColor: color.hex } : undefined
    }>
      <Link href={detailUrl} className="block">
        <div className="relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border max-w-[200px] mx-auto">
          {item.poster ? (
            <Image
              src={item.poster}
              alt={`Poster de ${item.title}`}
              fill
              sizes="(min-width: 640px) 200px, 40vw"
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Film className="size-8 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="mt-3 text-center">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {item.mediaType === "tv" ? (
              <Tv className="size-3" />
            ) : (
              <Film className="size-3" />
            )}
            {item.mediaType === "tv" ? "Serie" : "Peli"}
            {item.year !== null && <span>· {item.year}</span>}
          </div>
          <h3 className="text-sm sm:text-base font-bold tracking-tight mt-1 hover:underline line-clamp-2">
            {item.title}
          </h3>
        </div>
      </Link>
      {item.genres.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mt-2">
          {item.genres.slice(0, 2).map((g) => (
            <span
              key={g.id}
              className={cn(
                "inline-block px-1.5 py-0.5 text-[10px] rounded-full border",
                genreBadgeClass(g.id)
              )}
            >
              {g.name}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function ScoreCell({
  label,
  score,
  big = false,
  highlight = null,
  align = "center",
}: {
  label?: string;
  score: number | null;
  big?: boolean;
  highlight?: "winner" | "loser" | "tie" | null;
  align?: "left" | "right" | "center";
}) {
  const alignClass =
    align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  return (
    <div className={cn(alignClass, "min-w-0")}>
      {label && (
        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground truncate mb-1">
          {label}
        </div>
      )}
      <div
        className={cn(
          "inline-flex items-center gap-1.5",
          align === "left" && "flex-row-reverse"
        )}
      >
        {score === null ? (
          <span
            className={cn(
              "text-muted-foreground",
              big ? "text-2xl" : "text-base"
            )}
          >
            —
          </span>
        ) : (
          <span
            className={cn(
              "font-serif italic font-normal tabular-nums leading-none",
              big ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl",
              highlight === null && "text-foreground",
              highlight === "winner" && "text-primary",
              highlight === "loser" && "text-muted-foreground",
              highlight === "tie" && "text-amber-400"
            )}
          >
            {score.toFixed(1)}
          </span>
        )}
        {highlight === "winner" && score !== null && (
          <Crown className="size-4 text-emerald-400" />
        )}
        {highlight === "tie" && score !== null && (
          <Minus className="size-4 text-amber-400" />
        )}
        {highlight === "loser" && score !== null && (
          <X className="size-4 text-rose-400 opacity-60" />
        )}
      </div>
      {big && score !== null && (
        <div className="text-xs text-muted-foreground mt-0.5">/10</div>
      )}
    </div>
  );
}
