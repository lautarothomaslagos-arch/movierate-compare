"use client";

import { Trash } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { HistoryItemCard } from "@/app/historial/HistoryItemCard";
import {
  clearAllHistory,
  deleteHistoryItem,
} from "@/app/actions/history";
import { Button } from "@/components/ui/button";
import type { HistoryItem } from "@/lib/history";

// Render del listado para usuarios logueados.
// Recibe los items ya cargados desde el server (page.tsx) y maneja delete/clear
// vía server actions.
export function DbHistoryList({ items }: { items: HistoryItem[] }) {
  const [isClearing, startClearTransition] = useTransition();

  function handleClearAll() {
    if (!confirm("¿Borrar todo el historial? No se puede deshacer.")) return;
    startClearTransition(async () => {
      const r = await clearAllHistory();
      if ("error" in r && r.error) {
        toast.error("No se pudo limpiar el historial.");
      } else {
        toast.success("Historial limpiado.");
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
          {items.length} {items.length === 1 ? "película" : "películas"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAll}
          disabled={isClearing}
        >
          <Trash className="size-4" />
          Limpiar todo
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
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <h2 className="font-semibold">Tu historial está vacío</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Las películas que abras van a aparecer acá.
      </p>
    </div>
  );
}
