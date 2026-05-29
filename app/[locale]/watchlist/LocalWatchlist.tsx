"use client";

import { Bookmark, Film } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import {
  getLocalWatchlist,
  type WatchlistItem,
} from "@/lib/watchlist-local";

// Para users no logueados: lee de localStorage en useEffect.
export function LocalWatchlist() {
  const [items, setItems] = useState<WatchlistItem[] | null>(null);
  const t = useTranslations("watchlist");

  useEffect(() => {
    setItems(getLocalWatchlist());
  }, []);

  if (items === null) {
    return <div className="text-sm text-muted-foreground">…</div>;
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <Bookmark className="size-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="font-serif italic font-normal text-xl sm:text-2xl">{t("empty")}</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          {t("emptyBody")}
        </p>
      </Card>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">
        {items.length === 1
          ? t("countOne", { count: items.length })
          : t("countOther", { count: items.length })}
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {items.map((item) => {
          const href =
            item.media_type === "tv"
              ? `/serie/${item.tmdb_id}`
              : `/movie/${item.tmdb_id}`;
          return (
            <Link
              key={`${item.media_type}-${item.tmdb_id}`}
              href={href}
              className="group block"
              prefetch={false}
            >
              <div className="poster-frame relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border group-hover:ring-primary/60">
                {item.poster_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                    alt={`Poster ${item.title}`}
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
                {item.title}
              </div>
              {item.year !== null && (
                <div className="text-xs text-muted-foreground">
                  {item.year}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
