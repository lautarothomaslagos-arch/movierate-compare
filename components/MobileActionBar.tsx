"use client";

import { Bookmark, Share2 } from "lucide-react";

import { BrandStar } from "@/components/BrandStar";

// Barra fija inferior en mobile (sm:hidden) con atajos a las acciones
// principales de una página de detalle.
//
// Layout (lecciones aprendidas):
// - left-0 right-0 bottom-0 explícitos (más confiable que inset-x-0 cuando
//   hay ancestros con stacking contexts).
// - w-screen para garantizar full viewport sin importar wrappers.
// - Padding-bottom como inline style con calc(env(safe-area-inset-bottom)
//   + 1rem). El padding inferior generoso evita el indicador de gestos
//   de Samsung One UI / barra nav nativa de Android (ese chrome del SO
//   se mete sobre la app y NO lo cubre `env()` solo).
// - viewport-fit=cover en app/layout.tsx asegura que env(safe-area-...)
//   devuelva valores reales.

interface MobileActionBarProps {
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
        "sm:hidden fixed left-0 right-0 bottom-0 w-screen z-30 " +
        "border-t border-border/40 bg-background/95 backdrop-blur"
      }
      // Inline style: calc() en arbitrary values de Tailwind a veces no
      // parsea bien la coma de env(). Inline es bulletproof.
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
        paddingTop: "0.5rem",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
      aria-label="Acciones rápidas"
    >
      <div className="grid grid-cols-3 gap-1 px-3">
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
      type="button"
      onClick={onClick}
      className={
        "flex flex-col items-center justify-center gap-1 py-2 rounded-lg " +
        "text-muted-foreground hover:text-foreground active:bg-accent " +
        "transition-colors min-w-0"
      }
    >
      {icon}
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}
