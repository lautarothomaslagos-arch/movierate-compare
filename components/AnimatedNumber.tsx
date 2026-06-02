"use client";

import { useEffect, useState } from "react";

// Cuenta animada de 0 (o desde un valor inicial) hasta `value`. Usado para
// el weighted average del Billboard — el número grande aparece "subiendo"
// hasta la nota final. Da identidad y atención sin distraer.
//
// Respeta prefers-reduced-motion → muestra el valor final directo.
// Easing: easeOutCubic, sensación de "frenado" suave.
//
// Performance: usa requestAnimationFrame, no setInterval. Cancela on unmount
// y cada vez que cambia `value` (por re-render).

interface AnimatedNumberProps {
  /** Valor final al que animar. */
  value: number;
  /** Duración en ms. Default 800. */
  duration?: number;
  /** Decimales a mostrar. Default 1. */
  decimals?: number;
}

export function AnimatedNumber({
  value,
  duration = 800,
  decimals = 1,
}: AnimatedNumberProps) {
  const [current, setCurrent] = useState(value);
  const [reduced, setReduced] = useState(false);

  // Detectar prefers-reduced-motion una sola vez.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
  }, []);

  useEffect(() => {
    if (reduced) {
      setCurrent(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    setCurrent(0);
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setCurrent(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);

  return <>{current.toFixed(decimals)}</>;
}
