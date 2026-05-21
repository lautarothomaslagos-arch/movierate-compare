"use client";

import { Trash } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { HistoryItemCard } from "@/app/[locale]/historial/HistoryItemCard";
import { Button } from "@/components/ui/button";
import {
  clearLocalHistory,
  getLocalHistory,
  removeLocalItem,
  type HistoryItem,
} from "@/lib/history-local";

// Para usuarios NO logueados: leemos localStorage en useEffect (client-only).
export function LocalHistoryList() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const t = useTranslations("history");
  const tCommon = useTranslations("common");

  useEffect(() => {
    setItems(getLocalHistory());
  }, []);

  function handleDelete(id: number, mediaType: "movie" | "tv") {
    removeLocalItem(id, mediaType);
    setItems((prev) =>
      prev
        ? prev.filter((x) => !(x.tmdb_id === id && x.media_type === mediaType))
        : prev
    );
  }

  function handleClearAll() {
    if (!confirm(t("clearConfirm"))) return;
    clearLocalHistory();
    setItems([]);
    toast.success(t("cleared"));
  }

  if (items === null) {
    return (
      <div className="text-sm text-muted-foreground">{tCommon("loading")}</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h2 className="font-semibold">{t("empty")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("emptyBody")}</p>
        <p className="text-xs text-muted-foreground mt-3">
          {t("anonymousNote")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {items.length === 1
            ? t("countOne", { count: items.length })
            : t("countOther", { count: items.length })}{" "}
          · {t("savedInBrowser")}
        </p>
        <Button variant="outline" size="sm" onClick={handleClearAll}>
          <Trash className="size-4" />
          {t("clearAll")}
        </Button>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={`${item.media_type}-${item.tmdb_id}`}>
            <HistoryItemCard
              tmdb_id={item.tmdb_id}
              media_type={item.media_type}
              title={item.title}
              year={item.year}
              poster_path={item.poster_path}
              onDelete={(id, mediaType) => {
                handleDelete(id, mediaType);
                return Promise.resolve({ ok: true });
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
