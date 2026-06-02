"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addToWatchlist,
  removeFromWatchlist,
} from "@/app/actions/watchlist";
import { Button } from "@/components/ui/button";
import {
  dispatchWatchlistChange,
  subscribeToWatchlistChange,
} from "@/lib/watchlist-events";
import {
  addToLocalWatchlist,
  isInLocalWatchlist,
  removeFromLocalWatchlist,
} from "@/lib/watchlist-local";

// Botón "Agregar a Mi lista" / "Quitar de Mi lista".
// Soporta logueado (DB) y anónimo (localStorage). El estado inicial viene
// como prop desde el server (page.tsx hace el chequeo de DB).
export function WatchlistButton({
  item,
  isLogged,
  initiallyInList,
}: {
  item: {
    tmdb_id: number;
    media_type: "movie" | "tv";
    title: string;
    year: number | null;
    poster_path: string | null;
  };
  isLogged: boolean;
  initiallyInList: boolean;
}) {
  const t = useTranslations("watchlist");
  const [inList, setInList] = useState(initiallyInList);
  const [isPending, startTransition] = useTransition();

  // Para anónimos: chequeamos localStorage en mount (el server no sabe)
  useEffect(() => {
    if (!isLogged) {
      setInList(isInLocalWatchlist(item.tmdb_id, item.media_type));
    }
  }, [isLogged, item.tmdb_id, item.media_type]);

  // Sincronización entre múltiples instancias del botón en la misma página
  // (ej. WatchlistButton arriba + MobileActionBar abajo). Escuchamos eventos
  // y nos actualizamos si coincide el item.
  useEffect(() => {
    return subscribeToWatchlistChange((detail) => {
      if (
        detail.tmdb_id === item.tmdb_id &&
        detail.media_type === item.media_type
      ) {
        setInList(detail.inList);
      }
    });
  }, [item.tmdb_id, item.media_type]);

  // Helper: actualizo estado local + disparo evento global para que
  // las otras instancias del botón en la misma página se sincronicen.
  function commit(newValue: boolean) {
    setInList(newValue);
    dispatchWatchlistChange({
      tmdb_id: item.tmdb_id,
      media_type: item.media_type,
      inList: newValue,
    });
  }

  function handleClick() {
    if (isLogged) {
      startTransition(async () => {
        if (inList) {
          const r = await removeFromWatchlist(item.tmdb_id, item.media_type);
          if ("error" in r && r.error) {
            toast.error(t("removeError"));
            return;
          }
          commit(false);
          toast.success(t("removed"));
        } else {
          const r = await addToWatchlist(item);
          if ("error" in r && r.error) {
            toast.error(t("addError"));
            return;
          }
          commit(true);
          toast.success(t("added"));
        }
      });
    } else {
      // Anónimo: localStorage
      if (inList) {
        removeFromLocalWatchlist(item.tmdb_id, item.media_type);
        commit(false);
        toast.success(t("removed"));
      } else {
        addToLocalWatchlist(item);
        commit(true);
        toast.success(t("added"));
      }
    }
  }

  return (
    <Button
      variant={inList ? "secondary" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {inList ? (
        <>
          <BookmarkCheck className="size-4" />
          {t("inList")}
        </>
      ) : (
        <>
          <Bookmark className="size-4" />
          {t("addToList")}
        </>
      )}
    </Button>
  );
}
