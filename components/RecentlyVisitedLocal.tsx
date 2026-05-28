"use client";

import { History } from "lucide-react";
import { useEffect, useState } from "react";

import { RecentlyVisitedGrid } from "@/components/RecentlyVisitedGrid";
import { Link } from "@/i18n/navigation";
import { getLocalHistory, type HistoryItem } from "@/lib/history-local";

// Versión client para usuarios anónimos. Lee localStorage en useEffect.
// Renderiza null hasta hidratar para evitar mismatch SSR/CSR.
export function RecentlyVisitedLocal({
  limit = 6,
  heading,
}: {
  limit?: number;
  heading: string;
}) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);

  useEffect(() => {
    setItems(getLocalHistory().slice(0, limit));
  }, [limit]);

  if (items === null || items.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight tracking-tight inline-flex items-baseline gap-2">
          <History className="size-5 text-muted-foreground" />
          {heading}
        </h2>
        <Link
          href="/historial"
          prefetch={false}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          →
        </Link>
      </div>
      <RecentlyVisitedGrid items={items} />
    </section>
  );
}
