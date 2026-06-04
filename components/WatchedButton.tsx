"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { addToWatched, removeFromWatched } from "@/app/actions/watched";
import { Button } from "@/components/ui/button";
import {
  dispatchWatchedChange,
  subscribeToWatchedChange,
} from "@/lib/watched-events";
import {
  dispatchWatchlistChange,
} from "@/lib/watchlist-events";
import {
  addToLocalWatched,
  isInLocalWatched,
  removeFromLocalWatched,
} from "@/lib/watched-local";
import {
  removeFromLocalWatchlist,
} from "@/lib/watchlist-local";

// Botón "Ya la vi" / "La saco". Espejo de WatchlistButton.
//
// Comportamiento: al marcar como vista, también dispara un evento de
// watchlist:remove (para que el WatchlistButton de la página actualice
// su estado si tenía el item).

export function WatchedButton({
  item,
  isLogged,
  initiallyWatched,
}: {
  item: {
    tmdb_id: number;
    media_type: "movie" | "tv";
    title: string;
    year: number | null;
    poster_path: string | null;
  };
  isLogged: boolean;
  initiallyWatched: boolean;
}) {
  const t = useTranslations("watched");
  const [watched, setWatched] = useState(initiallyWatched);
  const [isPending, startTransition] = useTransition();

  // Anónimo: chequear localStorage en mount
  useEffect(() => {
    if (!isLogged) {
      setWatched(isInLocalWatched(item.tmdb_id, item.media_type));
    }
  }, [isLogged, item.tmdb_id, item.media_type]);

  // Sync con otras instancias del botón en la misma página
  useEffect(() => {
    return subscribeToWatchedChange((detail) => {
      if (
        detail.tmdb_id === item.tmdb_id &&
        detail.media_type === item.media_type
      ) {
        setWatched(detail.watched);
      }
    });
  }, [item.tmdb_id, item.media_type]);

  function commit(newValue: boolean) {
    setWatched(newValue);
    dispatchWatchedChange({
      tmdb_id: item.tmdb_id,
      media_type: item.media_type,
      watched: newValue,
    });
    // Al marcar como vista, el server action saca del watchlist. Avisamos
    // al WatchlistButton de la página para que también se actualice.
    if (newValue) {
      dispatchWatchlistChange({
        tmdb_id: item.tmdb_id,
        media_type: item.media_type,
        inList: false,
      });
    }
  }

  function handleClick() {
    if (isLogged) {
      startTransition(async () => {
        if (watched) {
          const r = await removeFromWatched(item.tmdb_id, item.media_type);
          if ("error" in r && r.error) {
            toast.error(t("removeError"));
            return;
          }
          commit(false);
          toast.success(t("removed"));
        } else {
          const r = await addToWatched(item);
          if ("error" in r && r.error) {
            toast.error(t("addError"));
            return;
          }
          commit(true);
          toast.success(t("added"));
        }
      });
    } else {
      // Anónimo: localStorage. Al marcar visto, también limpiamos
      // de la watchlist local (mismo principio que en la DB).
      if (watched) {
        removeFromLocalWatched(item.tmdb_id, item.media_type);
        commit(false);
        toast.success(t("removed"));
      } else {
        addToLocalWatched(item);
        removeFromLocalWatchlist(item.tmdb_id, item.media_type);
        commit(true);
        toast.success(t("added"));
      }
    }
  }

  return (
    <Button
      variant={watched ? "secondary" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {watched ? (
        <>
          <EyeOff className="size-4" />
          {t("watchedLabel")}
        </>
      ) : (
        <>
          <Eye className="size-4" />
          {t("markAsWatched")}
        </>
      )}
    </Button>
  );
}
