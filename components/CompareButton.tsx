"use client";

import { useQuery } from "@tanstack/react-query";
import { GitCompare, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

// Botón "Comparar" con un mini-buscador inline. Al seleccionar una peli/serie,
// navega a /comparar?a=current&b=selected. Excluye el item actual de los resultados.
export function CompareButton({
  currentId,
  currentMediaType,
}: {
  currentId: number;
  currentMediaType: "movie" | "tv";
}) {
  const t = useTranslations("compare");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounced(query, 300);

  // Click outside cierra el dropdown
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (
        open &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ["compareSearch", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}`
      );
      if (!res.ok) throw new Error("search failed");
      const json = (await res.json()) as { results: SearchResult[] };
      // Excluimos el item actual de los resultados
      return json.results.filter(
        (r) => !(r.id === currentId && r.media_type === currentMediaType)
      );
    },
    enabled: open && debouncedQuery.length >= 2,
  });

  const results = data ?? [];

  function pickSecond(item: SearchResult) {
    const a = `${currentMediaType}:${currentId}`;
    const b = `${item.media_type}:${item.id}`;
    router.push(`/comparar?a=${a}&b=${b}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <GitCompare className="size-4" />
        {t("compareAction")}
      </Button>

      {open && (
        <Card className="absolute z-50 mt-2 w-72 sm:w-80 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 p-2 shadow-[var(--shadow-2)]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              type="text"
              placeholder={t("pickSecond")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          <div className="max-h-72 overflow-y-auto mt-1">
            {debouncedQuery.length < 2 && (
              <p className="text-xs text-muted-foreground p-3 text-center">
                {t("searchPlaceholder")}
              </p>
            )}
            {debouncedQuery.length >= 2 && isFetching && results.length === 0 && (
              <p className="text-xs text-muted-foreground p-3 text-center">…</p>
            )}
            {debouncedQuery.length >= 2 && !isFetching && results.length === 0 && (
              <p className="text-xs text-muted-foreground p-3 text-center">
                Sin resultados
              </p>
            )}
            {results.map((m) => (
              <button
                key={`${m.media_type}-${m.id}`}
                type="button"
                onClick={() => pickSecond(m)}
                className="w-full flex items-center gap-2 p-1.5 text-left hover:bg-accent hover:text-accent-foreground transition-colors rounded"
              >
                <div className="relative shrink-0 w-8 h-11 bg-muted rounded-sm overflow-hidden">
                  {m.poster_path && (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                      alt=""
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate flex items-center gap-1">
                    <span className="truncate">{m.title}</span>
                    <span
                      className={cn(
                        "shrink-0 inline-block px-1 py-0 rounded text-[9px] font-semibold uppercase",
                        m.media_type === "tv"
                          ? "bg-purple-500/15 text-purple-400"
                          : "bg-blue-500/15 text-blue-400"
                      )}
                    >
                      {m.media_type === "tv" ? "Serie" : "Peli"}
                    </span>
                  </div>
                  {m.year !== null && (
                    <div className="text-[10px] text-muted-foreground">
                      {m.year}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
