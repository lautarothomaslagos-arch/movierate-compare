import { useId } from "react";

import { cn } from "@/lib/utils";

// Isotipo oficial "Estrella-nota". Estrella vectorial custom con porcentaje
// de fill brass desde abajo + outline cream. Match con la guía de marca.
//
// Defaults: 74% de fill (la "nota base" del sistema). brass = var(--primary)
// (oklch .82 .135 78 = #e0b870). El outline usa currentColor para heredar
// el foreground de donde se renderice (cream en dark, ink en light).
//
// Cada instancia genera un clipPath único vía useId — evita conflictos
// cuando hay múltiples BrandStar en la misma página.

const STAR_PATH =
  "M50 10 L40.60 37.06 L11.96 37.64 L34.78 54.94 L26.49 82.36 L50 66 L73.51 82.36 L65.22 54.94 L88.04 37.64 L59.41 37.06 Z";
// Geometría del fill: top=10, range=72.36 (top a bottom de la estrella).
const STAR_TOP = 10;
const STAR_RANGE = 72.36;

interface BrandStarProps {
  /** Tamaño en px (cuadrado). Default 24. */
  size?: number;
  /** Fill brass de 0 a 1. Default 0.74 (la "nota base" de marca). */
  fillPct?: number;
  /** Color brass del fill. Default var(--primary). */
  brassColor?: string;
  className?: string;
}

export function BrandStar({
  size = 24,
  fillPct = 0.74,
  brassColor = "var(--primary)",
  className,
}: BrandStarProps) {
  const reactId = useId();
  const clipId = `bstar-${reactId.replace(/:/g, "")}`;
  const fillY = STAR_TOP + (1 - fillPct) * STAR_RANGE;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={cn("inline-block shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={STAR_PATH} />
        </clipPath>
      </defs>
      {/* Ghost base: cream/foreground al 16% como tono de la silueta vacía */}
      <path d={STAR_PATH} fill="currentColor" fillOpacity={0.16} />
      {/* Fill brass desde la base, clippeado por la silueta */}
      <g clipPath={`url(#${clipId})`}>
        <rect x={0} y={fillY} width={100} height={100} fill={brassColor} />
      </g>
      {/* Outline cream encima */}
      <path
        d={STAR_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinejoin="round"
        strokeOpacity={0.85}
      />
    </svg>
  );
}
