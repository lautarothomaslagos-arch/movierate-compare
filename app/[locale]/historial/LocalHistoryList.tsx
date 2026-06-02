"use client";

import { Trash } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { HistoryFilters } from "@/app/[locale]/historial/HistoryFilters";
import { BrandStar } from "@/components/BrandStar";
import { Button } from "@/components/ui/button";
import {
  clearLocalHistory,
  getLocalHistory,
  removeLocalItem,
  type HistoryItem,
} from "@/lib/history-local";

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
    return Promise.resolve({ ok: true as const });
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
        {/* Estrella casi vacía → "historial por empezar" */}
        <div className="text-foreground/70 w-fit mx-auto mb-3">
          <BrandStar size={56} fillPct={0.12} />
        </div>
        <h2 className="font-serif italic font-normal text-xl sm:text-2xl">{t("empty")}</h2>
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
      <HistoryFilters items={items} onDelete={handleDelete} />
    </div>
  );
}
