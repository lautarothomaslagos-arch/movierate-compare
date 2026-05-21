"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
};

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

  const { data, isFetching, isError } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}`
      );
      if (!res.ok) throw new Error("search failed");
      const json = (await res.json()) as { results: SearchResult[] };
      return json.results;
    },
    enabled: debouncedQuery.length >= 2,
  });

  const results = data ?? [];
  const queryFinished = !isFetching && data !== undefined;
  const showDropdown =
    open && debouncedQuery.length >= 2 && (isFetching || queryFinished || isError);

  function selectItem(id: number, mediaType: "movie" | "tv") {
    setOpen(false);
    setQuery("");
    router.push(mediaType === "tv" ? `/serie/${id}` : `/movie/${id}`);
  }

  return (
    <div ref={containerRef} className="relative w-full">
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

      {showDropdown && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-lg overflow-hidden",
            "max-h-[min(70vh,28rem)] overflow-y-auto"
          )}
        >
          {isError && (
            <div className="p-3 text-sm text-destructive">{t("failed")}</div>
          )}

          {!isError && results.length === 0 && !isFetching && (
            <div className="p-3 text-sm text-muted-foreground">
              {t("noResults")}
            </div>
          )}

          {results.map((m) => (
            <button
              key={`${m.media_type}-${m.id}`}
              type="button"
              onClick={() => selectItem(m.id, m.media_type)}
              className="w-full flex items-center gap-3 p-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <div className="relative shrink-0 w-10 h-14 bg-muted rounded-sm overflow-hidden">
                {m.poster_path && (
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate flex items-center gap-1.5">
                  <span className="truncate">{m.title}</span>
                  <span
                    className={cn(
                      "shrink-0 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
                      m.media_type === "tv"
                        ? "bg-purple-500/15 text-purple-400"
                        : "bg-blue-500/15 text-blue-400"
                    )}
                  >
                    {m.media_type === "tv"
                      ? t("badgeTv")
                      : t("badgeMovie")}
                  </span>
                </div>
                {m.year !== null && (
                  <div className="text-xs text-muted-foreground">{m.year}</div>
                )}
              </div>
            </button>
          ))}

          {isFetching && results.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">
              {t("searching")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
