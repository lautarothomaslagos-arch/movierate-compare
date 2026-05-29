import { ChevronLeft, ChevronRight, Film, Star, Trophy } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";

import { DecadeFilter } from "@/components/DecadeFilter";
import { MediaTypeToggle, type MediaType } from "@/components/MediaTypeToggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { decadeToRange, parseDecade, type DecadeKey } from "@/lib/decades";
import { buildAlternates } from "@/lib/seo";
import {
  discoverTopMovies,
  discoverTopTv,
  getYear,
  posterUrl,
} from "@/lib/tmdb";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; page?: string; decade?: string }>;
};

function parseType(value: string | undefined): MediaType {
  return value === "tv" ? "tv" : "movie";
}

// Decade-aware metadata: genera title + description únicos por
// combinación type × decade. Esto le da a Google páginas optimizadas
// para queries como "mejores películas de los 90", "top series 2020",
// etc. Fase H.1.
const DECADE_LABELS: Record<DecadeKey, string> = {
  all: "",
  "2020s": "de los 2020",
  "2010s": "de los 2010",
  "2000s": "de los 2000",
  "90s": "de los 90",
  "80s": "de los 80",
  classics: "clásicas",
};

export async function generateMetadata({ params, searchParams }: Props) {
  const { locale } = await params;
  const { type, decade: decadeParam } = await searchParams;
  const mediaType = parseType(type);
  const decade = parseDecade(decadeParam);
  const decadeSuffix = decade !== "all" ? ` ${DECADE_LABELS[decade]}` : "";
  const isMovie = mediaType !== "tv";

  const title = isMovie
    ? `Las mejores películas${decadeSuffix}`
    : `Las mejores series${decadeSuffix}`;
  const description = isMovie
    ? `Top películas ordenadas por puntaje promedio en IMDb, Rotten Tomatoes, Metacritic, TMDB y Letterboxd${decadeSuffix ? ` ${decadeSuffix}` : ""}. Actualizado a diario.`
    : `Top series ordenadas por puntaje promedio en IMDb, Rotten Tomatoes, Metacritic y TMDB${decadeSuffix ? ` ${decadeSuffix}` : ""}. Actualizado a diario.`;

  // Path para canonical / alternates: respeta el query string actual
  const queryParts: string[] = [];
  if (!isMovie) queryParts.push("type=tv");
  if (decade !== "all") queryParts.push(`decade=${decade}`);
  const path = queryParts.length > 0 ? `/top?${queryParts.join("&")}` : "/top";

  return {
    title,
    description,
    alternates: buildAlternates(locale, path),
    openGraph: {
      title: `${title} · MovieRate Compare`,
      description,
      type: "website",
    },
  };
}

export default async function TopPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { type, page: pageParam, decade: decadeParam } = await searchParams;
  const t = await getTranslations("top");

  const mediaType = parseType(type);
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const decade = parseDecade(decadeParam);
  const yearRange = decadeToRange(decade);

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

  // Reducimos minVotes para clásicos/80s (catálogo más chico)
  const isOldDecade = decade === "80s" || decade === "classics";
  const minVotesMovies = isOldDecade ? 500 : 2000;
  const minVotesTv = isOldDecade ? 100 : 500;

  try {
    if (mediaType === "tv") {
      const data = await discoverTopTv(page, minVotesTv, yearRange);
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
      const data = await discoverTopMovies(page, minVotesMovies, yearRange);
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
    if (decade !== "all") sp.set("decade", decade);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/top${qs ? `?${qs}` : ""}`;
  }

  function decadeHref(d: DecadeKey): string {
    const sp = new URLSearchParams();
    if (mediaType === "tv") sp.set("type", "tv");
    if (d !== "all") sp.set("decade", d);
    // Resetea a página 1 al cambiar de década
    const qs = sp.toString();
    return `/top${qs ? `?${qs}` : ""}`;
  }

  // toggleHrefs preserva la década actual al cambiar entre pelis/series
  const toggleSuffix = decade !== "all" ? `&decade=${decade}` : "";
  const toggleHrefs: Record<MediaType, string> = {
    movie: decade !== "all" ? `/top?decade=${decade}` : "/top",
    tv: `/top?type=tv${toggleSuffix}`,
  };

  // Labels para las pills (traducidas)
  const decadeLabels: Record<DecadeKey, string> = {
    all: t("decade.all"),
    "2020s": t("decade.2020s"),
    "2010s": t("decade.2010s"),
    "2000s": t("decade.2000s"),
    "90s": t("decade.90s"),
    "80s": t("decade.80s"),
    classics: t("decade.classics"),
  };

  return (
    <main className="px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-serif italic font-normal text-3xl sm:text-4xl leading-[0.95] tracking-tight text-balance inline-flex items-baseline gap-2">
            <Trophy className="size-6 sm:size-7 text-amber-400" />
            {t("heading")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <MediaTypeToggle hrefs={toggleHrefs} active={mediaType} />
      </header>

      {/* Decade picker */}
      <div className="mb-5">
        <DecadeFilter
          active={decade}
          buildHref={decadeHref}
          labels={decadeLabels}
        />
      </div>

      {items.length === 0 && (
        <div className="rounded-md border border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {t("noResultsDecade")}
        </div>
      )}

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
              <div className="poster-frame relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border group-hover:ring-primary/60">
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

                {/* Rank badge esquina superior izquierda — serif italic
                    para que se vea "número de cartel" */}
                <div
                  className={cn(
                    "absolute top-1.5 left-1.5 px-2 py-0.5 rounded font-serif italic font-normal leading-none text-base sm:text-lg tabular-nums shadow",
                    rank === 1
                      ? "bg-primary text-primary-foreground"
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
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-emerald-500/90 text-white text-[10px] inline-flex items-center gap-0.5 shadow">
                  <Star className="size-2.5 fill-current" />
                  <span className="font-serif italic font-normal text-sm tabular-nums leading-none">
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
