"use client";

import { Trash } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { HistoryItemCard } from "@/app/[locale]/historial/HistoryItemCard";
import {
  clearAllHistory,
  deleteHistoryItem,
} from "@/app/actions/history";
import { Button } from "@/components/ui/button";
import type { HistoryItem } from "@/lib/history";

export function DbHistoryList({ items }: { items: HistoryItem[] }) {
  const [isClearing, startClearTransition] = useTransition();
  const t = useTranslations("history");

  function handleClearAll() {
    if (!confirm(t("clearConfirm"))) return;
    startClearTransition(async () => {
      const r = await clearAllHistory();
      if ("error" in r && r.error) {
        toast.error(t("clearError"));
      } else {
        toast.success(t("cleared"));
      }
    });
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length === 1
            ? t("countOne", { count: items.length })
            : t("countOther", { count: items.length })}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAll}
          disabled={isClearing}
        >
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
              onDelete={deleteHistoryItem}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState() {
  const t = useTranslations("history");
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <h2 className="font-semibold">{t("empty")}</h2>
      <p className="text-sm text-muted-foreground mt-1">{t("emptyBody")}</p>
    </div>
  );
}
