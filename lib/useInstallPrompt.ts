"use client";

import { useCallback, useEffect, useState } from "react";

// Hook compartido para el flujo "Instalar app" de PWA.
// =====================================================================
// Chrome/Edge/Android disparan `beforeinstallprompt` cuando la PWA cumple
// los criterios (HTTPS + manifest válido + SW + íconos). Capturamos el
// evento, lo guardamos en estado, y exponemos `install()` para mostrar
// el prompt nativo.
//
// Por qué hook compartido: tenemos el botón en desktop (InstallAppButton)
// y un item en el menú hamburguesa (mobile). Como solo uno se renderiza
// por vez (responsive), no hay race condition.
//
// iOS no soporta beforeinstallprompt → canInstall queda false y los
// componentes no muestran nada. Eso es OK (iOS pide Compartir → Agregar
// a inicio, no se puede automatizar).

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = "movierate.install-dismissed";

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Si el user ya dijo "después" antes, no molestamos.
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      // private mode → localStorage tira; no es crítico
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault(); // evitamos el mini-banner default de Chrome
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferred(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "dismissed") {
        try {
          window.localStorage.setItem(DISMISS_KEY, "1");
        } catch {
          // ignore
        }
        setDismissed(true);
      }
    } catch (err) {
      console.warn("[install] prompt failed:", err);
    } finally {
      setDeferred(null);
    }
  }, [deferred]);

  return {
    canInstall: !!deferred && !dismissed,
    install,
  };
}
