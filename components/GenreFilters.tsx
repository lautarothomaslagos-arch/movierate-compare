"use client";

import { Filter, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type ActiveFilters = {
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
  runtime?: "short" | "normal" | "long";
};

const CURRENT_YEAR = new Date().getFullYear();

// Botón con badge que abre un panel de filtros. Al aplicar, navega con
// los query params correspondientes. Lee los activos desde props para
// reflejar el estado actual de la URL.
export function GenreFilters({
  basePath,
  preserveParams = {},
  active,
  hideRuntime = false,
}: {
  // Path base sin querystring, ej: "/genero/28"
  basePath: string;
  // Params a preservar al aplicar (ej: sort, type)
  preserveParams?: Record<string, string>;
  active: ActiveFilters;
  // Para series ocultamos runtime (los episodios varían mucho)
  hideRuntime?: boolean;
}) {
  const t = useTranslations("filters");
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Estado local del form (no aplica hasta click en "Aplicar")
  const [yearFrom, setYearFrom] = useState<string>(
    active.yearFrom?.toString() ?? ""
  );
  const [yearTo, setYearTo] = useState<string>(
    active.yearTo?.toString() ?? ""
  );
  const [minRating, setMinRating] = useState<number>(active.minRating ?? 0);
  const [runtime, setRuntime] = useState<ActiveFilters["runtime"] | "">(
    active.runtime ?? ""
  );

  // Cerrar al click outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        open &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Re-sincronizar el form cuando cambian los filtros activos (ej. user
  // navegó via Back)
  useEffect(() => {
    setYearFrom(active.yearFrom?.toString() ?? "");
    setYearTo(active.yearTo?.toString() ?? "");
    setMinRating(active.minRating ?? 0);
    setRuntime(active.runtime ?? "");
  }, [active.yearFrom, active.yearTo, active.minRating, active.runtime]);

  const activeCount =
    (active.yearFrom !== undefined ? 1 : 0) +
    (active.yearTo !== undefined ? 1 : 0) +
    (active.minRating !== undefined && active.minRating > 0 ? 1 : 0) +
    (active.runtime !== undefined ? 1 : 0);

  function apply() {
    const sp = new URLSearchParams(preserveParams);
    const yf = parseInt(yearFrom, 10);
    const yt = parseInt(yearTo, 10);
    if (Number.isFinite(yf) && yf > 1900) sp.set("yearFrom", String(yf));
    if (Number.isFinite(yt) && yt > 1900) sp.set("yearTo", String(yt));
    if (minRating > 0) sp.set("minRating", String(minRating));
    if (runtime) sp.set("runtime", runtime);
    const qs = sp.toString();
    router.push(`${basePath}${qs ? `?${qs}` : ""}`);
    setOpen(false);
  }

  function clearAll() {
    setYearFrom("");
    setYearTo("");
    setMinRating(0);
    setRuntime("");
    const sp = new URLSearchParams(preserveParams);
    const qs = sp.toString();
    router.push(`${basePath}${qs ? `?${qs}` : ""}`);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant={activeCount > 0 ? "secondary" : "outline"}
        size="sm"
        onClick={() => setOpen((v) => !v)}
      >
        <Filter className="size-4" />
        {t("title")}
        {activeCount > 0 && (
          <span className="ml-1 inline-flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
            {activeCount}
          </span>
        )}
      </Button>

      {open && (
        <Card className="absolute z-50 mt-2 right-0 w-80 p-4 shadow-[var(--shadow-2)] space-y-4">
          {/* Año */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("yearLabel")}
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t("yearFromPlaceholder")}
                min={1900}
                max={CURRENT_YEAR + 2}
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                className="text-sm"
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t("yearToPlaceholder")}
                min={1900}
                max={CURRENT_YEAR + 2}
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("ratingLabel")}
              </label>
              <span className="text-sm font-bold tabular-nums">
                {minRating > 0 ? `${minRating.toFixed(1)}+` : "—"}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={9}
              step={0.5}
              value={minRating}
              onChange={(e) => setMinRating(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Runtime */}
          {!hideRuntime && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("runtimeLabel")}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <RuntimeOption
                  active={runtime === ""}
                  label={t("runtimeAny")}
                  onClick={() => setRuntime("")}
                />
                <RuntimeOption
                  active={runtime === "short"}
                  label={t("runtimeShort")}
                  onClick={() => setRuntime("short")}
                />
                <RuntimeOption
                  active={runtime === "normal"}
                  label={t("runtimeNormal")}
                  onClick={() => setRuntime("normal")}
                />
                <RuntimeOption
                  active={runtime === "long"}
                  label={t("runtimeLong")}
                  onClick={() => setRuntime("long")}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button onClick={apply} size="sm" className="flex-1">
              {t("applyBtn")}
            </Button>
            {activeCount > 0 && (
              <Button
                onClick={clearAll}
                size="sm"
                variant="outline"
                aria-label={t("clearBtn")}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function RuntimeOption({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2 py-1.5 rounded-md text-xs font-medium transition-colors text-left",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
