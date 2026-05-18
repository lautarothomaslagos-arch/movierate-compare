"use client";

import { Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { HistoryItemCard } from "@/app/historial/HistoryItemCard";
import { Button } from "@/components/ui/button";
import {
  clearLocalHistory,
  getLocalHistory,
  removeLocalItem,
  type HistoryItem,
} from "@/lib/history-local";

// Para usuarios NO logueados: leemos localStorage en useEffect (client-only).
// useState hidratación-safe: arrancamos con null hasta que monte.
export function LocalHistoryList() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);

  useEffect(() => {
    setItems(getLocalHistory());
  }, []);

  function handleDelete(id: number) {
    removeLocalItem(id);
    setItems((prev) => (prev ? prev.filter((x) => x.tmdb_id !== id) : prev));
  }

  function handleClearAll() {
    if (!confirm("¿Borrar todo el historial? No se puede deshacer.")) return;
    clearLocalHistory();
    setItems([]);
    toast.success("Historial limpiado.");
  }

  if (items === null) {
    // Mientras hidrata
    return (
      <div className="text-sm text-muted-foreground">Cargando historial...</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h2 className="font-semibold">Tu historial está vacío</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Las películas que abras van a aparecer acá.
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          Estás navegando sin sesión. Si iniciás sesión con Google, tu historial
          se guarda en la nube.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "película" : "películas"} ·
          guardadas en este navegador
        </p>
        <Button variant="outline" size="sm" onClick={handleClearAll}>
          <Trash className="size-4" />
          Limpiar todo
        </Button>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.tmdb_id}>
            <HistoryItemCard
              tmdb_id={item.tmdb_id}
              title={item.title}
              year={item.year}
              poster_path={item.poster_path}
              onDelete={(id) => {
                handleDelete(id);
                return Promise.resolve({ ok: true });
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
