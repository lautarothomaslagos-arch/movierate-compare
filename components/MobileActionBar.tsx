"use client";

import { Bookmark, Share2 } from "lucide-react";

import { BrandStar } from "@/components/BrandStar";

// Barra fija inferior en mobile (sm:hidden). En páginas largas de detalle
// (movie/serie) sirve como "remoto" para saltar rápido a las 3 acciones
// principales sin scrollear toda la página:
//
//   [ Mi nota ]  [ Lista ]  [ Compartir ]
//
// Cada botón es un anchor-scroll con behavior smooth a su sección:
//   - "Mi nota"   → #review-section
//   - "Lista"     → #actions
//   - "Compartir" → #actions (los botones reales viven ahí)
//
// Por qué scrollToView en vez de duplicar la lógica de los botones:
//   1. WatchlistButton tiene estado optimistic (inList) — duplicar
//      requeriría coordinación, fácil de romper.
//   2. ShareButton llama navigator.share + fallback clipboard — se
//      podría replicar pero suma código sin mucho beneficio.
//   3. El anchor-scroll es accesible, predecible, y resalta la sección.

interface MobileActionBarProps {
  /** Si false, el botón "Mi nota" queda como CTA de login (mismo scroll). */
  isLogged?: boolean;
}

export function MobileActionBar({ isLogged = false }: MobileActionBarProps) {
  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      className={
        // Solo mobile. z-30 sobre carruseles, debajo de modals (z-50).
        // backdrop-blur + bg semi-transparente para coherencia con Header.
        // safe-area inset bottom para iOS (notch).
        "sm:hidden fixed bottom-0 inset-x-0 z-30 " +
        "border-t border-border/40 bg-background/80 backdrop-blur " +
        "supports-[backdrop-filter]:bg-background/60 " +
        "pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 px-3"
      }
      aria-label="Acciones rápidas"
    >
      <div className="mx-auto max-w-md grid grid-cols-3 gap-1">
        <ActionButton
          onClick={() => scrollTo("review-section")}
          label={isLogged ? "Mi nota" : "Calificar"}
          icon={
            <span className="text-foreground">
              <BrandStar size={20} fillPct={isLogged ? 0.74 : 0.12} />
            </span>
          }
        />
        <ActionButton
          onClick={() => scrollTo("actions")}
          label="Lista"
          icon={<Bookmark className="size-5" />}
        />
        <ActionButton
          onClick={() => scrollTo("actions")}
          label="Compartir"
          icon={<Share2 className="size-5" />}
        />
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex flex-col items-center justify-center gap-1 py-2 rounded-lg " +
        "text-muted-foreground hover:text-foreground active:bg-accent " +
        "transition-colors"
      }
    >
      {icon}
      <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
        {label}
      </span>
    </button>
  );
}
