import { ArrowLeft, Crown, Film, Minus, Tv, X } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";

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

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
};

export async function generateMetadata({ searchParams }: Props) {
  const { a, b } = await searchParams;
  if (!a || !b) return { title: "Comparar — MovieRate Compare" };
  return {
    title: "Comparar — MovieRate Compare",
    description: "Compará dos pelis o series lado a lado por sus ratings.",
  };
}

export default async function CompararPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("compare");
  const tRatings = await getTranslations("ratings");
  const { a, b } = await searchParams;

  const keyA = parseCompareKey(a);
  const keyB = parseCompareKey(b);

  // Si falta una, mostramos UI de "elegí desde la página de la peli"
  if (!keyA || !keyB) {
    return (
      <main className="px-4 sm:px-6 py-12 max-w-3xl mx-auto w-full text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
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

  // Fetch en paralelo de ambas
  let itemA: ComparableItem;
  let itemB: ComparableItem;
  try {
    [itemA, itemB] = await Promise.all([
      fetchComparable(keyA.mediaType, keyA.id),
      fetchComparable(keyB.mediaType, keyB.id),
    ]);
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

  const avgA = computeWeightedAverage(itemA.ratings);
  const avgB = computeWeightedAverage(itemB.ratings);

  // Plataformas a comparar fila por fila
  const platforms: Array<{ key: RatingKey; label: string }> = [
    { key: "imdb", label: tRatings("imdb") },
    { key: "rt", label: tRatings("rt") },
    { key: "metacritic", label: tRatings("metacritic") },
    { key: "tmdb", label: tRatings("tmdb") },
  ];
  // Letterboxd solo si AMBAS son pelis (no indexa series)
  if (itemA.mediaType === "movie" && itemB.mediaType === "movie") {
    platforms.push({ key: "letterboxd", label: tRatings("letterboxd") });
  }

  // URLs de detalle por item
  function detailUrl(item: ComparableItem): string {
    return item.mediaType === "tv" ? `/serie/${item.id}` : `/movie/${item.id}`;
  }

  return (
    <main className="px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {t("heading")}
        </h1>
      </header>

      {/* Top: posters + info básica de cada uno */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <ItemColumn item={itemA} detailUrl={detailUrl(itemA)} />
        <ItemColumn item={itemB} detailUrl={detailUrl(itemB)} />
      </div>

      {/* Promedio ponderado fila destacada */}
      <Card className="mt-6 p-4 sm:p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t("averageLabel")}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-6 items-center">
          <ScoreCell
            label={itemA.title}
            score={avgA?.score10 ?? null}
            big
            highlight={
              avgA && avgB
                ? avgA.score10 > avgB.score10
                  ? "winner"
                  : avgA.score10 < avgB.score10
                    ? "loser"
                    : "tie"
                : null
            }
          />
          <ScoreCell
            label={itemB.title}
            score={avgB?.score10 ?? null}
            big
            highlight={
              avgA && avgB
                ? avgB.score10 > avgA.score10
                  ? "winner"
                  : avgB.score10 < avgA.score10
                    ? "loser"
                    : "tie"
                : null
            }
          />
        </div>
      </Card>

      {/* Tabla de ratings por plataforma */}
      <div className="mt-4 space-y-2">
        {platforms.map((p) => {
          const ra: PlatformRating | null | undefined = itemA.ratings[p.key];
          const rb: PlatformRating | null | undefined = itemB.ratings[p.key];
          const va = ra?.score10 ?? null;
          const vb = rb?.score10 ?? null;
          let winner: "a" | "b" | "tie" | null = null;
          if (va !== null && vb !== null) {
            winner = va > vb ? "a" : va < vb ? "b" : "tie";
          }
          return (
            <div
              key={p.key}
              className="grid grid-cols-[1fr_auto_1fr] sm:grid-cols-[1fr_120px_1fr] gap-2 sm:gap-4 items-center"
            >
              <ScoreCell
                score={va}
                highlight={winner === "a" ? "winner" : winner === "b" ? "loser" : null}
                align="right"
              />
              <div className="text-center text-xs font-medium text-muted-foreground py-2 px-2 sm:px-4 border-y border-border/40">
                {p.label}
              </div>
              <ScoreCell
                score={vb}
                highlight={winner === "b" ? "winner" : winner === "a" ? "loser" : null}
                align="left"
              />
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
}: {
  item: ComparableItem;
  detailUrl: string;
}) {
  return (
    <Card className="p-3 sm:p-4">
      <Link href={detailUrl} className="block">
        <div className="relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border max-w-[200px] mx-auto">
          {item.poster ? (
            <Image
              src={item.poster}
              alt={`Poster de ${item.title}`}
              fill
              sizes="200px"
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
          <h3 className="text-sm sm:text-base font-bold tracking-tight mt-1 hover:underline">
            {item.title}
          </h3>
        </div>
      </Link>
      {item.genres.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mt-2">
          {item.genres.slice(0, 3).map((g) => (
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
              "tabular-nums font-bold",
              big ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl",
              highlight === "winner" && "text-emerald-400",
              highlight === "loser" && "text-rose-400",
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
