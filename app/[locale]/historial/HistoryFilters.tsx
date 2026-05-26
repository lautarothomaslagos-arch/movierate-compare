"use client";

import { Film, List, Search, Tv } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";

import { HistoryItemCard } from "@/app/[locale]/historial/HistoryItemCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FilterableItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
};

type FilterValue = "all" | "movie" | "tv";

// Wrapper que aplica tabs (Todas/Pelis/Series) + búsqueda a una lista
// arbitraria. El render de cada item se delega a HistoryItemCard que ya
// sabe cómo dibujarse (con onDelete distinto según DB/local).
export function HistoryFilters({
  items,
  onDelete,
}: {
  items: FilterableItem[];
  onDelete: (
    id: number,
    mediaType: "movie" | "tv"
  ) => void | Promise<{ error?: string; ok?: true }>;
}) {
  const t = useTranslations("history");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let result = items;
    if (filter !== "all") {
      result = result.filter((x) => x.media_type === filter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((x) => x.title.toLowerCase().includes(q));
    }
    return result;
  }, [items, filter, query]);

  const tabs: Array<{ value: FilterValue; label: string; icon: React.ReactNode }> =
    [
      {
        value: "all",
        label: t("filterAll"),
        icon: <List className="size-3.5" />,
      },
      {
        value: "movie",
        label: t("filterMovies"),
        icon: <Film className="size-3.5" />,
      },
      {
        value: "tv",
        label: t("filterTv"),
        icon: <Tv className="size-3.5" />,
      },
    ];

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div
          role="tablist"
          className="inline-flex items-center gap-1 p-1 rounded-md border bg-secondary/40 shrink-0"
        >
          {tabs.map((tab) => {
            const isActive = filter === tab.value;
            return (
              <button
                key={tab.value}
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {t("noFilterResults")}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <li key={`${item.media_type}-${item.tmdb_id}`}>
              <HistoryItemCard
                tmdb_id={item.tmdb_id}
                media_type={item.media_type}
                title={item.title}
                year={item.year}
                poster_path={item.poster_path}
                onDelete={onDelete}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
