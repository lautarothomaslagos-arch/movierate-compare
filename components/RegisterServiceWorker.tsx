"use client";

import { useEffect } from "react";

// Registra /sw.js al mount — Fase H.2.
// El SW se autoinstala y skip-waiting toma control al toque. Solo
// registramos en producción para no interferir con HMR / Turbopack
// durante desarrollo.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    // Pequeño delay para no competir con el primer paint
    const t = window.setTimeout(() => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("[SW] register failed:", err);
        });
    }, 1000);

    return () => window.clearTimeout(t);
  }, []);

  return null;
}
