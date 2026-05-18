"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: number;
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

  function selectMovie(id: number) {
    setOpen(false);
    setQuery("");
    router.push(`/movie/${id}`);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Buscá una película..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-9 h-11 text-base"
          aria-label="Buscar película"
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
            <div className="p-3 text-sm text-destructive">
              Falló la búsqueda. Probá de nuevo.
            </div>
          )}

          {!isError && results.length === 0 && !isFetching && (
            <div className="p-3 text-sm text-muted-foreground">
              No encontramos nada.
            </div>
          )}

          {results.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => selectMovie(m.id)}
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
                <div className="text-sm font-medium truncate">{m.title}</div>
                {m.year !== null && (
                  <div className="text-xs text-muted-foreground">{m.year}</div>
                )}
              </div>
            </button>
          ))}

          {isFetching && results.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">Buscando...</div>
          )}
        </div>
      )}
    </div>
  );
}
