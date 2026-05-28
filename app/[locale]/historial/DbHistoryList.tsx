"use client";

import { Trash } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { HistoryFilters } from "@/app/[locale]/historial/HistoryFilters";
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
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h2 className="font-serif italic font-normal text-xl sm:text-2xl">{t("empty")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("emptyBody")}</p>
      </div>
    );
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
      <HistoryFilters items={items} onDelete={deleteHistoryItem} />
    </div>
  );
}
