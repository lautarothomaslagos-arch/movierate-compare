import { ChevronLeft, ChevronRight, Film, Star, Trophy } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";

import { MediaTypeToggle, type MediaType } from "@/components/MediaTypeToggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  discoverTopMovies,
  discoverTopTv,
  getYear,
  posterUrl,
} from "@/lib/tmdb";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; page?: string }>;
};

function parseType(value: string | undefined): MediaType {
  return value === "tv" ? "tv" : "movie";
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { locale: _ } = await params;
  void _;
  const { type } = await searchParams;
  const mediaType = parseType(type);
  return {
    title: `Top ${mediaType === "tv" ? "Series" : "Películas"} — MovieRate Compare`,
    description:
      mediaType === "tv"
        ? "Las mejores series según TMDB ordenadas por puntaje"
        : "Las mejores películas según TMDB ordenadas por puntaje",
  };
}

export default async function TopPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { type, page: pageParam } = await searchParams;
  const t = await getTranslations("top");

  const mediaType = parseType(type);
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  // Fetch top items
  let items: Array<{
    id: number;
    title: string;
    year: number | null;
    poster_path: string | null;
    vote_average: number;
    vote_count: number;
  }> = [];
  let totalPages = 1;

  try {
    if (mediaType === "tv") {
      const data = await discoverTopTv(page);
      items = data.results.map((t) => ({
        id: t.id,
        title: t.name,
        year: getYear(t.first_air_date),
        poster_path: t.poster_path ?? null,
        vote_average: t.vote_average ?? 0,
        vote_count: 0, // TMDB no devuelve vote_count en discover. Lo mostramos 0 oculto.
      }));
      totalPages = Math.min(data.total_pages, 500);
    } else {
      const data = await discoverTopMovies(page);
      items = data.results.map((m) => ({
        id: m.id,
        title: m.title,
        year: getYear(m.release_date),
        poster_path: m.poster_path ?? null,
        vote_average: m.vote_average ?? 0,
        vote_count: 0,
      }));
      totalPages = Math.min(data.total_pages, 500);
    }
  } catch (err) {
    console.error("[/top] failed:", err);
  }

  const itemHrefPrefix = mediaType === "tv" ? "/serie" : "/movie";
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const startRank = (page - 1) * 20 + 1; // TMDB devuelve 20 por página

  function pageUrl(p: number): string {
    const sp = new URLSearchParams();
    if (mediaType === "tv") sp.set("type", "tv");
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/top${qs ? `?${qs}` : ""}`;
  }

  const toggleHrefs: Record<MediaType, string> = {
    movie: "/top",
    tv: "/top?type=tv",
  };

  return (
    <main className="px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight inline-flex items-center gap-2">
            <Trophy className="size-6 sm:size-7 text-amber-400" />
            {t("heading")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <MediaTypeToggle hrefs={toggleHrefs} active={mediaType} />
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {items.map((m, idx) => {
          const rank = startRank + idx;
          const poster = posterUrl(m.poster_path, "w342");
          return (
            <Link
              key={m.id}
              href={`${itemHrefPrefix}/${m.id}`}
              className="group block relative"
              prefetch={false}
            >
              <div className="relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border transition-all group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-primary/60">
                {poster ? (
                  <Image
                    src={poster}
                    alt={`Poster de ${m.title}`}
                    fill
                    sizes="(min-width: 1024px) 200px, (min-width: 768px) 240px, (min-width: 640px) 33vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Film className="size-8 text-muted-foreground" />
                  </div>
                )}

                {/* Rank badge esquina superior izquierda */}
                <div
                  className={cn(
                    "absolute top-1.5 left-1.5 px-2 py-1 rounded text-xs font-bold shadow",
                    rank === 1
                      ? "bg-amber-500 text-black"
                      : rank === 2
                        ? "bg-zinc-300 text-black"
                        : rank === 3
                          ? "bg-amber-700/90 text-white"
                          : "bg-background/90 backdrop-blur text-foreground"
                  )}
                >
                  {t("rank", { n: rank })}
                </div>

                {/* Rating badge esquina superior derecha */}
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-emerald-500/90 text-white text-[10px] font-bold inline-flex items-center gap-0.5 shadow">
                  <Star className="size-2.5 fill-current" />
                  <span className="tabular-nums">
                    {m.vote_average.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="mt-1.5 text-sm font-medium truncate">
                {m.title}
              </div>
              {m.year !== null && (
                <div className="text-xs text-muted-foreground">{m.year}</div>
              )}
            </Link>
          );
        })}
      </div>

      {(hasPrev || hasNext) && (
        <nav className="mt-8 flex items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm" disabled={!hasPrev}>
            {hasPrev ? (
              <Link href={pageUrl(page - 1)} prefetch={false}>
                <ChevronLeft className="size-4" />
              </Link>
            ) : (
              <span>
                <ChevronLeft className="size-4" />
              </span>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t("page", { page })}
          </span>
          <Button asChild variant="outline" size="sm" disabled={!hasNext}>
            {hasNext ? (
              <Link href={pageUrl(page + 1)} prefetch={false}>
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span>
                <ChevronRight className="size-4" />
              </span>
            )}
          </Button>
        </nav>
      )}
    </main>
  );
}
