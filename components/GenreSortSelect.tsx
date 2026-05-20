"use client";

import { Flame, Sparkles, Star } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type GenreSort = "popular" | "top" | "recent";

const OPTIONS: Array<{
  value: GenreSort;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "popular", label: "Populares", icon: Flame },
  { value: "top", label: "Mejor puntuadas", icon: Star },
  { value: "recent", label: "Más recientes", icon: Sparkles },
];

// Selector tipo "pill" navega entre las opciones. Cambiar de sort resetea
// page a 1 (no propagamos page entre cambios). Es Server-Component-friendly
// (sólo Links, sin estado). Preserva el type (tv) si está activo.
export function GenreSortSelect({
  genreId,
  active,
  mediaType = "movie",
}: {
  genreId: number;
  active: GenreSort;
  mediaType?: "movie" | "tv";
}) {
  return (
    <div
      role="tablist"
      aria-label="Ordenar películas"
      className="inline-flex items-center gap-1 p-1 rounded-md border bg-secondary/40"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const isActive = value === active;
        const sp = new URLSearchParams();
        if (value !== "popular") sp.set("sort", value);
        if (mediaType === "tv") sp.set("type", "tv");
        const qs = sp.toString();
        const href = `/genero/${genreId}${qs ? `?${qs}` : ""}`;
        return (
          <Link
            key={value}
            href={href}
            role="tab"
            aria-selected={isActive}
            prefetch={false}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
