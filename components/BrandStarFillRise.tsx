"use client";

import { useEffect, useState } from "react";

import { BrandStar } from "@/components/BrandStar";

// Wrapper animado de BrandStar: el fill brass sube de 0 al `to` en `duration` ms
// con easeOutCubic. Usado en /loading (splash) y signoffs. Si el usuario
// pidió prefers-reduced-motion, va directo al valor final.
//
// La animación replica el `fillrise` del HTML de marca: la estrella aparece
// vacía y el brass va subiendo desde la base hasta la "nota base" 0.74.

interface BrandStarFillRiseProps {
  /** Fill objetivo, 0 a 1. Default 0.74. */
  to?: number;
  /** Duración en ms. Default 1300. */
  duration?: number;
  /** Tamaño en px. Default 120. */
  size?: number;
  className?: string;
}

export function BrandStarFillRise({
  to = 0.74,
  duration = 1300,
  size = 120,
  className,
}: BrandStarFillRiseProps) {
  const [fill, setFill] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
  }, []);

  useEffect(() => {
    if (reduced) {
      setFill(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    setFill(0);
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setFill(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, reduced]);

  return <BrandStar size={size} fillPct={fill} className={className} />;
}
