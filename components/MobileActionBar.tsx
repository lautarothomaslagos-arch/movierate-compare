"use client";

import { Bookmark, BookmarkCheck, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addToWatchlist,
  removeFromWatchlist,
} from "@/app/actions/watchlist";
import { BrandStar } from "@/components/BrandStar";
import {
  addToLocalWatchlist,
  isInLocalWatchlist,
  removeFromLocalWatchlist,
} from "@/lib/watchlist-local";

// Barra fija inferior en mobile (sm:hidden). Atajos rápidos a las acciones:
//
//   [ Mi nota ]   [ Lista / En lista ]   [ Compartir ]
//
//   - Mi nota → scroll a #review-section (no podemos abrir el slider sin
//     duplicar mucha lógica de ReviewSection).
//   - Lista → ejecuta el toggle de watchlist directo (misma lógica que
//     WatchlistButton). Muestra "En lista" + brass si ya está agregado.
//   - Compartir → llama navigator.share directo, fallback a copiar URL.
//
// Nota: la barra mantiene su propio state inList. Si el user toggle desde
// la barra, el WatchlistButton de arriba NO se actualiza visualmente hasta
// recargar (no compartimos state). Aceptable por ahora.

interface MobileActionBarProps {
  isLogged: boolean;
  item: {
    tmdb_id: number;
    media_type: "movie" | "tv";
    title: string;
    year: number | null;
    poster_path: string | null;
  };
  initiallyInList: boolean;
  shareTitle: string;
  shareText?: string;
}

export function MobileActionBar({
  isLogged,
  item,
  initiallyInList,
  shareTitle,
  shareText,
}: MobileActionBarProps) {
  const tWatchlist = useTranslations("watchlist");
  const tShare = useTranslations("share");
  const [inList, setInList] = useState(initiallyInList);
  const [isPending, startTransition] = useTransition();

  // Anónimo: el server no sabe qué hay en localStorage, chequeamos en mount
  useEffect(() => {
    if (!isLogged) {
      setInList(isInLocalWatchlist(item.tmdb_id, item.media_type));
    }
  }, [isLogged, item.tmdb_id, item.media_type]);

  function scrollToReview() {
    const el = document.getElementById("review-section");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleWatchlist() {
    if (isLogged) {
      startTransition(async () => {
        if (inList) {
          const r = await removeFromWatchlist(item.tmdb_id, item.media_type);
          if ("error" in r && r.error) {
            toast.error(tWatchlist("removeError"));
            return;
          }
          setInList(false);
          toast.success(tWatchlist("removed"));
        } else {
          const r = await addToWatchlist(item);
          if ("error" in r && r.error) {
            toast.error(tWatchlist("addError"));
            return;
          }
          setInList(true);
          toast.success(tWatchlist("added"));
        }
      });
    } else {
      if (inList) {
        removeFromLocalWatchlist(item.tmdb_id, item.media_type);
        setInList(false);
        toast.success(tWatchlist("removed"));
      } else {
        addToLocalWatchlist(item);
        setInList(true);
        toast.success(tWatchlist("added"));
      }
    }
  }

  async function share() {
    try {
      const url = window.location.href;
      const data: ShareData = { title: shareTitle, url };
      if (shareText) data.text = shareText;

      if (typeof navigator.share === "function") {
        try {
          await navigator.share(data);
          return;
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          // Otro error → caemos al clipboard
        }
      }

      await navigator.clipboard.writeText(url);
      toast.success(tShare("copied"));
    } catch (err) {
      console.warn("[share] failed:", err);
      toast.error(tShare("failed"));
    }
  }

  return (
    <div
      className={
        "sm:hidden fixed left-0 right-0 bottom-0 w-screen z-30 " +
        "border-t border-border/40 bg-background/95 backdrop-blur"
      }
      style={{
        // Padding inferior reducido (~20%) pero conservando safe-area para
        // que no quede tapada por el gesture indicator de Samsung One UI.
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)",
        paddingTop: "0.25rem",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
      aria-label="Acciones rápidas"
    >
      <div className="grid grid-cols-3 gap-1 px-3">
        <ActionButton
          onClick={scrollToReview}
          label={isLogged ? "Mi nota" : "Calificar"}
          icon={
            <span className="text-foreground">
              <BrandStar size={18} fillPct={isLogged ? 0.74 : 0.12} />
            </span>
          }
        />
        <ActionButton
          onClick={toggleWatchlist}
          label={inList ? "En lista" : "Lista"}
          disabled={isPending}
          highlighted={inList}
          icon={
            inList ? (
              <BookmarkCheck className="size-[18px]" />
            ) : (
              <Bookmark className="size-[18px]" />
            )
          }
        />
        <ActionButton
          onClick={share}
          label="Compartir"
          icon={<Share2 className="size-[18px]" />}
        />
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  label,
  icon,
  disabled,
  highlighted,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  highlighted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg " +
        "active:bg-accent transition-colors min-w-0 " +
        "disabled:opacity-50 " +
        (highlighted
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {icon}
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] whitespace-nowrap leading-tight">
        {label}
      </span>
    </button>
  );
}
