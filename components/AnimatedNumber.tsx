"use client";

import { useEffect, useState } from "react";

// Cuenta animada de 0 hasta `value` con easeOutCubic en rAF. Usado para el
// weighted average del Billboard — el número grande aparece "subiendo".
//
// Implementación cuidada (lecciones aprendidas):
// 1. Un solo useEffect: combinamos la detección de reduced-motion adentro
//    del mismo efecto que arranca la animación. Antes había DOS efectos y
//    el de detección disparaba un re-render que interrumpía la animación.
// 2. Forzamos setCurrent(value) explícito al terminar — si por flotantes
//    `value * eased` no es exactamente igual a value, quedaba ligeramente
//    off del número final.
// 3. Flag `cancelled` además del cancelAnimationFrame — defensivo contra
//    callbacks ya programados que la cancelación no alcanza.
// 4. Validamos que `value` sea finito (NaN/Infinity → no animamos).

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
  // Init con el valor final → en SSR el HTML ya tiene el número correcto.
  const [current, setCurrent] = useState(value);

  useEffect(() => {
    // Guard contra valores inválidos
    if (!Number.isFinite(value)) {
      setCurrent(value);
      return;
    }

    // Respect reduced motion (chequeo inline, no en otro effect → no race)
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setCurrent(value);
      return;
    }

    let raf = 0;
    let cancelled = false;
    const start = performance.now();

    setCurrent(0);

    function tick(now: number) {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      if (t < 1) {
        setCurrent(value * eased);
        raf = requestAnimationFrame(tick);
      } else {
        // Final exacto: nada de "value * 0.9999"
        setCurrent(value);
      }
    }

    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return <>{current.toFixed(decimals)}</>;
}
