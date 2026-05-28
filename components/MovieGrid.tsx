"use client";

import { ChevronLeft, ChevronRight, Film } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type GridMovie = {
  id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
};

// Grid horizontal scrollable con:
// - scroll-snap por card (mobile-friendly: swipe natural)
// - flechas izq/der en desktop (hover-visible) que disparan scrollBy
// - gradient fade en los bordes cuando hay más contenido en esa dirección
// - oculta la flecha del lado donde no hay más para scrollear
export function MovieGrid({ movies }: { movies: GridMovie[] }) {
  const scrollerRef = useRef<HTMLUListElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const t = useTranslations("movie");

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setAtStart(scrollLeft <= 4); // tolerancia
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      ro.disconnect();
    };
  }, [updateEdges, movies.length]);

  function scrollByCards(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    // ~2.5 cards de ancho por scroll click
    const distance = el.clientWidth * 0.7;
    el.scrollBy({ left: direction * distance, behavior: "smooth" });
  }

  if (movies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("noSimilar")}</p>
    );
  }

  return (
    <div className="relative group">
      {/* Gradient fade — izquierda. Solo desktop (md+) para no tapar contenido
          en mobile donde el "hay más" es obvio por el swipe natural. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none hidden md:block absolute inset-y-0 left-0 w-12 z-10",
          "bg-gradient-to-r from-background to-transparent",
          "transition-opacity duration-200",
          atStart ? "opacity-0" : "opacity-100"
        )}
      />

      {/* Gradient fade — derecha */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none hidden md:block absolute inset-y-0 right-0 w-12 z-10",
          "bg-gradient-to-l from-background to-transparent",
          "transition-opacity duration-200",
          atEnd ? "opacity-0" : "opacity-100"
        )}
      />

      {/* Flecha izquierda — solo desktop (md+), visible si hay scroll pendiente */}
      <button
        type="button"
        onClick={() => scrollByCards(-1)}
        aria-label="Scrollear a la izquierda"
        className={cn(
          "hidden md:flex absolute left-1 top-1/3 -translate-y-1/2 z-20 size-9 items-center justify-center rounded-full",
          "bg-background/80 backdrop-blur border shadow-sm",
          "hover:bg-background hover:scale-105 transition-all",
          atStart && "opacity-0 pointer-events-none"
        )}
      >
        <ChevronLeft className="size-5" />
      </button>

      {/* Flecha derecha */}
      <button
        type="button"
        onClick={() => scrollByCards(1)}
        aria-label="Scrollear a la derecha"
        className={cn(
          "hidden md:flex absolute right-1 top-1/3 -translate-y-1/2 z-20 size-9 items-center justify-center rounded-full",
          "bg-background/80 backdrop-blur border shadow-sm",
          "hover:bg-background hover:scale-105 transition-all",
          atEnd && "opacity-0 pointer-events-none"
        )}
      >
        <ChevronRight className="size-5" />
      </button>

      <ul
        ref={scrollerRef}
        className={cn(
          // snap-proximity (no mandatory) en mobile para no "secuestrar" el
          // scroll. En desktop mantenemos snap-x normal porque las flechas
          // ya empujan a posiciones discretas.
          "flex gap-3 snap-x overflow-x-auto pb-2",
          "[scroll-snap-type:x_proximity] md:[scroll-snap-type:x_mandatory]",
          "scroll-smooth -mx-4 sm:mx-0 px-4 sm:px-0"
        )}
        style={{
          scrollbarWidth: "thin",
        }}
      >
        {movies.map((m) => (
          <li
            key={m.id}
            className="shrink-0 w-32 sm:w-36 md:w-40 snap-start"
          >
            <Link
              href={`/movie/${m.id}`}
              className="group/card block"
              prefetch={false}
            >
              <div className="relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border transition-all duration-200 group-hover/card:-translate-y-1 group-hover/card:ring-2 group-hover/card:ring-primary/60 group-hover/card:shadow-[var(--shadow-1)]">
                {m.poster_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                    alt={`Poster de ${m.title}`}
                    fill
                    sizes="(min-width: 768px) 160px, (min-width: 640px) 144px, 128px"
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
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MovieGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-hidden pb-2">
      <div className="flex gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="shrink-0 w-32 sm:w-36 md:w-40">
            <Skeleton className="aspect-[2/3] rounded-md" />
            <Skeleton className="mt-1.5 h-3 w-3/4" />
            <Skeleton className="mt-1 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
