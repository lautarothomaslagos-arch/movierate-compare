"use client";

import { useEffect, useRef } from "react";

// Cuenta animada de 0 hasta `value` con easeOutCubic. Es CRÍTICO que termine
// siempre en el valor exacto — es el número más importante de la página.
//
// Implementación: DOM directo via ref, NO state de React. Por qué:
//   - El estado de React + rAF + Suspense streaming + hydration generaban
//     re-renders en momentos imprevistos que dejaban el número "saltando"
//     y sin terminar en el final.
//   - Manipulando textContent directo el animation loop corre por afuera
//     del ciclo de React → cero race conditions con re-renders del parent.
//   - El cleanup SIEMPRE setea el valor final como red de seguridad, incluso
//     si React desmonta el componente a mitad de animación.
//
// SSR: el span renderiza el valor final ya formateado para que el HTML
// inicial sea correcto (y no haya hydration mismatch).

interface AnimatedNumberProps {
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
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Defensiva: NaN/Infinity → mostramos el valor como string, sin animar.
    if (!Number.isFinite(value)) {
      el.textContent = String(value);
      return;
    }

    // Respeta prefers-reduced-motion → directo al final.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      el.textContent = value.toFixed(decimals);
      return;
    }

    let raf = 0;
    let cancelled = false;
    const start = performance.now();
    const finalText = value.toFixed(decimals);

    function tick(now: number) {
      if (cancelled || !el) return;
      const t = Math.min(1, (now - start) / duration);
      if (t < 1) {
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = (value * eased).toFixed(decimals);
        raf = requestAnimationFrame(tick);
      } else {
        // Final exacto, no value * 0.99999
        el.textContent = finalText;
      }
    }

    el.textContent = (0).toFixed(decimals);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      // RED DE SEGURIDAD: si React desmonta a mitad de animación
      // (por ejemplo si el padre re-monta), igual quedamos en el valor final.
      if (el && Number.isFinite(value)) {
        el.textContent = finalText;
      }
    };
  }, [value, duration, decimals]);

  // SSR / primer paint: el HTML ya tiene el valor final formateado.
  // useEffect luego lo "rewindea" a 0 y anima hasta acá.
  return (
    <span ref={ref}>
      {Number.isFinite(value) ? value.toFixed(decimals) : String(value)}
    </span>
  );
}
