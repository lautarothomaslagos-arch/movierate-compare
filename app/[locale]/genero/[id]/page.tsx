import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Film,
  PartyPopper,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";

import { GenreFilters, type ActiveFilters } from "@/components/GenreFilters";
import { GenreSortSelect, type GenreSort } from "@/components/GenreSortSelect";
import { MediaTypeToggle, type MediaType } from "@/components/MediaTypeToggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  discoverByGenre,
  discoverTvByGenre,
  getGenres,
  getTvGenres,
  getYear,
  posterUrl,
  type DiscoverFilters,
  type DiscoverSort,
} from "@/lib/tmdb";
import type { TmdbGenre } from "@/types/movie";

type Props = {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
    type?: string;
    yearFrom?: string;
    yearTo?: string;
    minRating?: string;
    runtime?: string;
  }>;
};

function parseSort(value: string | undefined): DiscoverSort {
  if (value === "top" || value === "recent") return value;
  return "popular";
}

function parseType(value: string | undefined): MediaType {
  return value === "tv" ? "tv" : "movie";
}

// Normaliza un nombre de género para matching: lowercase, sin acentos,
// sin "and"/"y" y palabras genéricas, sin espacios duplicados.
function normalizeGenreName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Busca el género equivalente en el otro tipo por nombre normalizado.
// Si los nombres no matchean exactamente, intentamos matching parcial
// (por ejemplo "accion" matchea "accion y aventura").
function findEquivalentGenre(
  source: TmdbGenre,
  targetList: TmdbGenre[]
): TmdbGenre | null {
  const sourceNorm = normalizeGenreName(source.name);

  // Match exacto
  const exact = targetList.find(
    (g) => normalizeGenreName(g.name) === sourceNorm
  );
  if (exact) return exact;

  // Match parcial: el nombre normalizado de uno está contenido en el otro
  const partial = targetList.find((g) => {
    const targetNorm = normalizeGenreName(g.name);
    return targetNorm.includes(sourceNorm) || sourceNorm.includes(targetNorm);
  });
  return partial ?? null;
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { id } = await params;
  const { type: typeParam } = await searchParams;
  const genreId = parseInt(id, 10);
  if (!Number.isFinite(genreId)) return { title: "MovieRate Compare" };
  const mediaType = parseType(typeParam);

  try {
    const data =
      mediaType === "tv" ? await getTvGenres() : await getGenres();
    const genre = data.genres.find((g) => g.id === genreId);
    if (!genre) return { title: "MovieRate Compare" };
    const noun = mediaType === "tv" ? "Series" : "Películas";
    return {
      title: `${genre.name} (${noun}) — MovieRate Compare`,
      description: `${noun} del género ${genre.name} ordenadas por popularidad.`,
    };
  } catch {
    return { title: "MovieRate Compare" };
  }
}

export default async function GeneroPage({ params, searchParams }: Props) {
  const { id, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("genres");
  const {
    page: pageParam,
    sort: sortParam,
    type: typeParam,
    yearFrom: yearFromParam,
    yearTo: yearToParam,
    minRating: minRatingParam,
    runtime: runtimeParam,
  } = await searchParams;
  const genreId = parseInt(id, 10);
  if (!Number.isFinite(genreId)) notFound();

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const sort = parseSort(sortParam);
  const mediaType = parseType(typeParam);

  // Filtros avanzados — parseo desde query string
  const filters: DiscoverFilters = {};
  const activeFilters: ActiveFilters = {};
  const yf = parseInt(yearFromParam ?? "", 10);
  if (Number.isFinite(yf) && yf > 1900 && yf < 2200) {
    filters.yearFrom = yf;
    activeFilters.yearFrom = yf;
  }
  const yt = parseInt(yearToParam ?? "", 10);
  if (Number.isFinite(yt) && yt > 1900 && yt < 2200) {
    filters.yearTo = yt;
    activeFilters.yearTo = yt;
  }
  const mr = parseFloat(minRatingParam ?? "");
  if (Number.isFinite(mr) && mr > 0 && mr <= 10) {
    filters.minRating = mr;
    activeFilters.minRating = mr;
  }
  if (
    runtimeParam === "short" ||
    runtimeParam === "normal" ||
    runtimeParam === "long"
  ) {
    filters.runtimeBucket = runtimeParam;
    activeFilters.runtime = runtimeParam;
  }

  // Traemos AMBOS conjuntos de géneros: el activo (para resolver el id actual
  // y validar) y el del otro tipo (para calcular el href del toggle).
  let activeGenres: TmdbGenre[];
  let otherGenres: TmdbGenre[];
  try {
    [activeGenres, otherGenres] = await Promise.all(
      mediaType === "tv"
        ? [
            getTvGenres().then((d) => d.genres),
            getGenres().then((d) => d.genres),
          ]
        : [
            getGenres().then((d) => d.genres),
            getTvGenres().then((d) => d.genres),
          ]
    );
  } catch {
    notFound();
  }

  const currentGenre = activeGenres.find((g) => g.id === genreId);

  // CASO: el ID no existe en este media_type. Mostramos fallback amigable
  // en vez de 404 — esto pasa cuando alguien comparte una URL imposible.
  if (!currentGenre) {
    const currentTypeLabel =
      mediaType === "tv" ? t("tvPlural") : t("moviesPlural");
    const otherTypeLabel =
      mediaType === "tv" ? t("moviesPlural") : t("tvPlural");
    const altType: MediaType = mediaType === "tv" ? "movie" : "tv";
    const altHref =
      altType === "tv" ? "/generos?type=tv" : "/generos";
    return (
      <main className="px-4 sm:px-6 py-16 max-w-2xl mx-auto w-full text-center">
        <PartyPopper className="size-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight tracking-tight text-balance">
          {t("mismatchTitle")}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          {t("mismatchBody", {
            currentType: currentTypeLabel,
            otherType: otherTypeLabel,
          })}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild>
            <Link
              href={
                mediaType === "tv" ? "/generos?type=tv" : "/generos"
              }
            >
              {mediaType === "tv"
                ? t("viewTvGenres")
                : t("viewMoviesGenres")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={altHref}>
              {t("viewOther", { other: otherTypeLabel })}
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  // Calculamos el href del toggle al otro tipo:
  // - Si hay un género equivalente por nombre → URL específica con su ID
  // - Si no, llevamos a la lista de géneros del otro tipo
  const equivalent = findEquivalentGenre(currentGenre, otherGenres);
  const otherTypeHref = (() => {
    if (mediaType === "tv") {
      // El toggle apunta a movie
      if (equivalent) return `/genero/${equivalent.id}`;
      return "/generos";
    } else {
      // El toggle apunta a tv
      if (equivalent) return `/genero/${equivalent.id}?type=tv`;
      return "/generos?type=tv";
    }
  })();

  const toggleHrefs: Record<MediaType, string> = {
    movie: mediaType === "movie" ? `/genero/${genreId}` : otherTypeHref,
    tv: mediaType === "tv" ? `/genero/${genreId}?type=tv` : otherTypeHref,
  };

  // Fetch del listado paginado
  let items: Array<{
    id: number;
    title: string;
    year: number | null;
    poster_path: string | null;
  }> = [];
  let totalPages = 1;
  try {
    if (mediaType === "tv") {
      const discover = await discoverTvByGenre(genreId, page, sort, filters);
      items = discover.results.map((t) => ({
        id: t.id,
        title: t.name,
        year: getYear(t.first_air_date),
        poster_path: t.poster_path ?? null,
      }));
      totalPages = Math.min(discover.total_pages, 500);
    } else {
      const discover = await discoverByGenre(genreId, page, sort, filters);
      items = discover.results.map((m) => ({
        id: m.id,
        title: m.title,
        year: getYear(m.release_date),
        poster_path: m.poster_path ?? null,
      }));
      totalPages = Math.min(discover.total_pages, 500);
    }
  } catch {
    notFound();
  }

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Helper para construir URLs de paginación manteniendo sort + type + filtros
  const pageUrl = (p: number) => {
    const sp = new URLSearchParams();
    if (p > 1) sp.set("page", String(p));
    if (sort !== "popular") sp.set("sort", sort);
    if (mediaType === "tv") sp.set("type", "tv");
    if (filters.yearFrom) sp.set("yearFrom", String(filters.yearFrom));
    if (filters.yearTo) sp.set("yearTo", String(filters.yearTo));
    if (filters.minRating) sp.set("minRating", String(filters.minRating));
    if (filters.runtimeBucket) sp.set("runtime", filters.runtimeBucket);
    const qs = sp.toString();
    return `/genero/${genreId}${qs ? `?${qs}` : ""}`;
  };

  // Params a preservar cuando se aplican/limpian filtros (sort + type)
  const preservedParams: Record<string, string> = {};
  if (sort !== "popular") preservedParams.sort = sort;
  if (mediaType === "tv") preservedParams.type = "tv";

  const itemHrefPrefix = mediaType === "tv" ? "/serie" : "/movie";
  const nounPlural =
    mediaType === "tv" ? t("tvPlural") : t("moviesPlural");
  const sortLabel = t(`sort.${sort}`);
  const localeForNumber = locale === "en" ? "en-US" : "es-AR";

  return (
    <main className="px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
      <Link
        href={mediaType === "tv" ? "/generos?type=tv" : "/generos"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ArrowLeft className="size-4" />
        {t("allGenres")}
      </Link>

      <header className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="font-serif italic font-normal text-3xl sm:text-4xl leading-[0.95] tracking-tight text-balance">
              {currentGenre.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("pageOfTotal", {
                page,
                total: totalPages.toLocaleString(localeForNumber),
                sort: sortLabel,
                plural: nounPlural,
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MediaTypeToggle hrefs={toggleHrefs} active={mediaType} />
            <GenreSortSelect
              genreId={genreId}
              active={sort}
              mediaType={mediaType}
            />
            <GenreFilters
              basePath={`/genero/${genreId}`}
              preserveParams={preservedParams}
              active={activeFilters}
              hideRuntime={mediaType === "tv"}
            />
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("noPlatformItems", { plural: nounPlural })}
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {items.map((m) => {
            const poster = posterUrl(m.poster_path, "w342");
            return (
              <Link
                key={m.id}
                href={`${itemHrefPrefix}/${m.id}`}
                className="group block"
                prefetch={false}
              >
                <div className="poster-frame relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border group-hover:ring-primary/60">
                  {poster ? (
                    <Image
                      src={poster}
                      alt={`Poster de ${m.title}`}
                      fill
                      sizes="(min-width: 768px) 192px, (min-width: 640px) 160px, 30vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Film className="size-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="mt-1.5 text-xs font-medium truncate">
                  {m.title}
                </div>
                {m.year !== null && (
                  <div className="text-xs text-muted-foreground">{m.year}</div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {(hasPrev || hasNext) && (
        <nav
          className="mt-8 flex items-center justify-between gap-3"
          aria-label="Paginación"
        >
          <Button asChild variant="outline" size="sm" disabled={!hasPrev}>
            {hasPrev ? (
              <Link href={pageUrl(page - 1)} prefetch={false}>
                <ChevronLeft className="size-4" />
                {t("previous")}
              </Link>
            ) : (
              <span>
                <ChevronLeft className="size-4" />
                {t("previous")}
              </span>
            )}
          </Button>

          <span className="text-xs text-muted-foreground">
            {page} / {totalPages.toLocaleString(localeForNumber)}
          </span>

          <Button asChild variant="outline" size="sm" disabled={!hasNext}>
            {hasNext ? (
              <Link href={pageUrl(page + 1)} prefetch={false}>
                {t("next")}
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span>
                {t("next")}
                <ChevronRight className="size-4" />
              </span>
            )}
          </Button>
        </nav>
      )}
    </main>
  );
}
