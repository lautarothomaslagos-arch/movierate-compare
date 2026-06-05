"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

// Tabs cliente para "Continuá donde dejaste".
// Si hay un solo tab visible, lo muestra como sección con título normal.
// Si hay 2+, muestra una barra de pills + el contenido del activo.

interface ContinueTabsProps {
  tabs: Array<{
    key: string;
    label: string;
    content: ReactNode;
    // Si count es 0, el tab no se renderiza (sirve para esconder
    // "Próximos" cuando no hay items aún sin tener que filtrar afuera).
    count?: number;
  }>;
}

export function ContinueTabs({ tabs }: ContinueTabsProps) {
  const visible = tabs.filter((t) => (t.count ?? 1) > 0);
  const [active, setActive] = useState<string>(visible[0]?.key ?? "");

  if (visible.length === 0) return null;

  if (visible.length === 1) {
    const only = visible[0];
    return (
      <section>
        <h2 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight tracking-tight mb-3">
          {only.label}
        </h2>
        {only.content}
      </section>
    );
  }

  return (
    <section>
      <div
        role="tablist"
        aria-label="Continuá donde dejaste"
        className="flex gap-1.5 mb-3 flex-wrap"
      >
        {visible.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.key)}
              className={cn(
                "inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors",
                "border",
                isActive
                  ? "bg-primary/15 text-primary border-primary/40"
                  : "text-muted-foreground border-border/40 hover:text-foreground hover:bg-accent"
              )}
            >
              <span className="font-serif italic font-normal text-base sm:text-lg">
                {t.label}
              </span>
              {t.count !== undefined && (
                <span className="font-mono text-[10px] opacity-70 tabular-nums">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* Renderizamos todos para que el cambio de tab sea instantáneo
          (no re-monta cada vez); ocultamos los inactivos con `hidden`. */}
      {visible.map((t) => (
        <div
          key={t.key}
          role="tabpanel"
          className={cn(active !== t.key && "hidden")}
        >
          {t.content}
        </div>
      ))}
    </section>
  );
}
