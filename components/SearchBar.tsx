"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, Flame, Search, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { getLocalHistory } from "@/lib/history-local";
import { cn } from "@/lib/utils";

type SearchResultMedia = {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
};

type SearchResultPerson = {
  id: number;
  media_type: "person";
  title: string;
  profile_path: string | null;
};

type SearchResult = SearchResultMedia | SearchResultPerson;

type SearchResponse = {
  results: SearchResult[];
  query: string;
  didYouMean: string | null;
};

type SuggestionsResponse = {
  // Sugerencias (recientes DB + trending) son solo pelis/series, no personas
  recent: SearchResultMedia[];
  trending: SearchResultMedia[];
};

// Géneros destacados como atajos (hardcoded — mismos que home FeaturedGenres)
const GENRE_SHORTCUTS = [
  { id: 28, emoji: "💥", esp: "Acción", eng: "Action" },
  { id: 35, emoji: "😂", esp: "Comedia", eng: "Comedy" },
  { id: 27, emoji: "👻", esp: "Terror", eng: "Horror" },
  { id: 10749, emoji: "💘", esp: "Romance", eng: "Romance" },
  { id: 878, emoji: "🛸", esp: "Ciencia ficción", eng: "Sci-Fi" },
  { id: 18, emoji: "🎭", esp: "Drama", eng: "Drama" },
];

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [localRecent, setLocalRecent] = useState<SearchResultMedia[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = useTranslations("search");
  const debouncedQuery = useDebounced(query, 300);

  // Cerrar el dropdown si clickeás afuera
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Cerrar el dropdown al scrollear (UX típica mobile). El input del
  // SearchBar va con el flujo del hero y se va hacia arriba mientras
  // el header sticky queda fijo — sin esto se ven solapados.
  useEffect(() => {
    if (!open) return;
    let startY = window.scrollY;
    function onScroll() {
      // Threshold de 24px para no cerrar por micro-scrolls del teclado
      // mobile cuando aparece (iOS / Android lo disparan involuntariamente).
      if (Math.abs(window.scrollY - startY) > 24) {
        setOpen(false);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  // Cargar recientes de localStorage en mount (fallback si no logueado)
  useEffect(() => {
    const items = getLocalHistory()
      .slice(0, 5)
      .map((h) => ({
        id: h.tmdb_id,
        media_type: h.media_type,
        title: h.title,
        year: h.year,
        poster_path: h.poster_path,
      }));
    setLocalRecent(items);
  }, []);

  // Búsqueda activa
  const {
    data: searchData,
    isFetching: searchFetching,
    isError: searchError,
  } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}`
      );
      if (!res.ok) throw new Error("search failed");
      return (await res.json()) as SearchResponse;
    },
    enabled: debouncedQuery.length >= 2,
  });

  // Sugerencias (recientes DB + trending) — solo cuando dropdown abierto sin query
  const { data: suggestionsData } = useQuery({
    queryKey: ["search-suggestions"],
    queryFn: async () => {
      const res = await fetch("/api/search/suggestions");
      if (!res.ok) throw new Error("suggestions failed");
      return (await res.json()) as SuggestionsResponse;
    },
    enabled: open && query.length === 0,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const results = searchData?.results ?? [];
  const didYouMean = searchData?.didYouMean ?? null;
  const queryFinished = !searchFetching && searchData !== undefined;
  const showResults = debouncedQuery.length >= 2;

  // Merge recientes DB con localStorage. Si hay DB, esos ganan; localStorage
  // complementa si no hay suficientes.
  const recentMerged: SearchResultMedia[] = (() => {
    const dbRecent = suggestionsData?.recent ?? [];
    if (dbRecent.length >= 5) return dbRecent;
    const seen = new Set(dbRecent.map((r) => `${r.media_type}-${r.id}`));
    const merged = [...dbRecent];
    for (const item of localRecent) {
      const key = `${item.media_type}-${item.id}`;
      if (!seen.has(key) && merged.length < 5) {
        merged.push(item);
        seen.add(key);
      }
    }
    return merged;
  })();

  function selectItem(id: number, mediaType: "movie" | "tv" | "person") {
    setOpen(false);
    setQuery("");
    if (mediaType === "person") {
      router.push(`/actor/${id}`);
      return;
    }
    router.push(mediaType === "tv" ? `/serie/${id}` : `/movie/${id}`);
  }

  return (
    // z-40 + isolate crea un stacking context para que el dropdown SI O SÍ
    // quede arriba de los carruseles que vienen abajo (los posters tienen
    // transform en hover, generan stacking contexts propios y nos tapaban
    // el dropdown sino).
    <div ref={containerRef} className="relative w-full z-40 isolate">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder={t("placeholder")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-9 h-11 text-base"
          aria-label={t("ariaLabel")}
          autoComplete="off"
        />
      </div>

      {open && (
        <div
          className={cn(
            "absolute z-[60] mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-[var(--shadow-2)] overflow-hidden",
            "max-h-[min(80vh,32rem)] overflow-y-auto"
          )}
        >
          {/* ESTADO 1: Sin query → empty state con recientes + trending + géneros */}
          {!showResults && (
            <EmptyState
              recent={recentMerged}
              trending={suggestionsData?.trending ?? []}
              onSelect={selectItem}
              onCloseDropdown={() => setOpen(false)}
              t={t}
            />
          )}

          {/* ESTADO 2: Con query (≥2 chars) */}
          {showResults && (
            <>
              {searchError && (
                <div className="p-3 text-sm text-destructive">{t("failed")}</div>
              )}

              {!searchError && queryFinished && results.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">
                  {t("noResults")}
                </div>
              )}

              {/* "Buscamos X" si hubo fallback */}
              {didYouMean && results.length > 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border/40 bg-muted/30">
                  {t("didYouMean")}
                  <span className="font-semibold text-foreground italic">
                    {didYouMean}
                  </span>
                </div>
              )}

              {results.map((m) => (
                <ResultRow
                  key={`${m.media_type}-${m.id}`}
                  item={m}
                  onClick={() => selectItem(m.id, m.media_type)}
                  t={t}
                />
              ))}

              {searchFetching && results.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">
                  {t("searching")}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  recent,
  trending,
  onSelect,
  onCloseDropdown,
  t,
}: {
  recent: SearchResultMedia[];
  trending: SearchResultMedia[];
  onSelect: (id: number, mediaType: "movie" | "tv" | "person") => void;
  onCloseDropdown: () => void;
  t: ReturnType<typeof useTranslations<"search">>;
}) {
  const hasRecent = recent.length > 0;
  const hasTrending = trending.length > 0;

  return (
    <div className="divide-y divide-border/40">
      {hasRecent && (
        <SuggestionSection
          icon={<Clock className="size-3.5" />}
          title={t("recentHeading")}
          items={recent}
          onSelect={onSelect}
          t={t}
        />
      )}

      {hasTrending && (
        <SuggestionSection
          icon={<TrendingUp className="size-3.5" />}
          title={t("trendingHeading")}
          items={trending}
          onSelect={onSelect}
          t={t}
        />
      )}

      {/* Atajos a géneros */}
      <div className="p-2">
        <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Flame className="size-3.5" />
          {t("genresHeading")}
        </div>
        <div className="flex flex-wrap gap-1.5 px-2 pt-1 pb-2">
          {GENRE_SHORTCUTS.map((g) => (
            <Link
              key={g.id}
              href={`/genero/${g.id}`}
              prefetch={false}
              onClick={onCloseDropdown}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-secondary/60 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <span>{g.emoji}</span>
              <span>{g.esp}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function SuggestionSection({
  icon,
  title,
  items,
  onSelect,
  t,
}: {
  icon: React.ReactNode;
  title: string;
  items: SearchResultMedia[];
  onSelect: (id: number, mediaType: "movie" | "tv" | "person") => void;
  t: ReturnType<typeof useTranslations<"search">>;
}) {
  return (
    <div className="p-2">
      <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </div>
      <div>
        {items.map((m) => (
          <ResultRow
            key={`${m.media_type}-${m.id}`}
            item={m}
            onClick={() => onSelect(m.id, m.media_type)}
            t={t}
            compact
          />
        ))}
      </div>
    </div>
  );
}

function ResultRow({
  item,
  onClick,
  t,
  compact = false,
}: {
  item: SearchResult;
  onClick: () => void;
  t: ReturnType<typeof useTranslations<"search">>;
  compact?: boolean;
}) {
  const isPerson = item.media_type === "person";

  // Persona usa profile_path con avatar circular; media usa poster vertical
  const imageSrc = isPerson
    ? item.profile_path
      ? `https://image.tmdb.org/t/p/w92${item.profile_path}`
      : null
    : item.poster_path
    ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 text-left hover:bg-accent hover:text-accent-foreground transition-colors rounded",
        compact ? "p-1.5" : "p-2"
      )}
    >
      <div
        className={cn(
          "relative shrink-0 bg-muted overflow-hidden",
          isPerson
            ? cn("rounded-full", compact ? "w-10 h-10" : "w-12 h-12")
            : cn("rounded-sm", compact ? "w-8 h-11" : "w-10 h-14")
        )}
      >
        {imageSrc && (
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes={compact ? "40px" : "48px"}
            className="object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate flex items-center gap-1.5">
          <span className="truncate">{item.title}</span>
          <span
            className={cn(
              "shrink-0 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
              item.media_type === "tv"
                ? "bg-purple-500/15 text-purple-400"
                : item.media_type === "person"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-blue-500/15 text-blue-400"
            )}
          >
            {item.media_type === "tv"
              ? t("badgeTv")
              : item.media_type === "person"
              ? t("badgePerson")
              : t("badgeMovie")}
          </span>
        </div>
        {item.media_type !== "person" && item.year !== null && (
          <div className="text-xs text-muted-foreground">{item.year}</div>
        )}
      </div>
    </button>
  );
}
