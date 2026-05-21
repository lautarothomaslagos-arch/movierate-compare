"use client";

import { Flame, Sparkles, Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type GenreSort = "popular" | "top" | "recent";

const OPTIONS: Array<{
  value: GenreSort;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "popular", labelKey: "popularLabel", icon: Flame },
  { value: "top", labelKey: "topLabel", icon: Star },
  { value: "recent", labelKey: "recentLabel", icon: Sparkles },
];

// Selector tipo "pill" navega entre las opciones. Cambiar de sort resetea
// page a 1. Server-Component-friendly (sólo Links). Preserva type (tv).
export function GenreSortSelect({
  genreId,
  active,
  mediaType = "movie",
}: {
  genreId: number;
  active: GenreSort;
  mediaType?: "movie" | "tv";
}) {
  const t = useTranslations("genres.sort");
  return (
    <div
      role="tablist"
      aria-label={t("popularLabel")}
      className="inline-flex items-center gap-1 p-1 rounded-md border bg-secondary/40"
    >
      {OPTIONS.map(({ value, labelKey, icon: Icon }) => {
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
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </Link>
        );
      })}
    </div>
  );
}
