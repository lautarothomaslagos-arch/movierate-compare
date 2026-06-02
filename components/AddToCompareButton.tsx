"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Agrega un título más a la comparación actual (hasta `maxItems`, default 4).
// La URL ya soporta a, b, c, d como params. Este botón es la UI faltante
// para que el user pueda llegar de 2 → 3 → 4 sin editar URL a mano.
//
// Excluye de los resultados los títulos que ya están en la comparación.

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

interface AddToCompareButtonProps {
  /** Keys actuales en formato "movie:123" o "tv:456". */
  currentKeys: string[];
  /** Máximo de items que soporta /comparar. Default 4 (a, b, c, d). */
  maxItems?: number;
}

const PARAM_NAMES = ["a", "b", "c", "d"];

export function AddToCompareButton({
  currentKeys,
  maxItems = 4,
}: AddToCompareButtonProps) {
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
    queryKey: ["addToCompareSearch", debouncedQuery, currentKeys.join(",")],
    queryFn: async () => {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}`
      );
      if (!res.ok) throw new Error("search failed");
      const json = (await res.json()) as { results: SearchResult[] };
      // Excluimos los que ya están en la comparación
      return json.results.filter(
        (r) => !currentKeys.includes(`${r.media_type}:${r.id}`)
      );
    },
    enabled: open && debouncedQuery.length >= 2,
  });

  const results = data ?? [];

  function pick(item: SearchResult) {
    const newKey = `${item.media_type}:${item.id}`;
    const allKeys = [...currentKeys, newKey].slice(0, maxItems);
    const qs = allKeys
      .map((k, i) => `${PARAM_NAMES[i]}=${encodeURIComponent(k)}`)
      .join("&");
    router.push(`/comparar?${qs}`);
  }

  // Si ya está lleno, ni renderizamos.
  if (currentKeys.length >= maxItems) return null;

  return (
    <div ref={containerRef} className="relative inline-block">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="gap-1.5"
      >
        <Plus className="size-4" />
        {t("addTitle")}
      </Button>

      {open && (
        <Card className="absolute z-50 mt-2 left-0 w-[min(20rem,calc(100vw-1.5rem))] p-2 shadow-[var(--shadow-2)]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              type="text"
              placeholder={t("pickAnother")}
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
                onClick={() => pick(m)}
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
