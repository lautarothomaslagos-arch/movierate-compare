"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

// Tipo del evento custom de Chrome — no está en TS lib estándar.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = "movierate.install-dismissed";

// Botón "Instalar app" — Fase H.2.
// Chrome/Edge desktop + Android disparan beforeinstallprompt cuando la PWA
// es instalable. Capturamos el evento, lo guardamos, y mostramos un botón
// custom en el header. Click → muestra el prompt nativo. iOS no soporta
// este evento (hay que ir a Compartir → Agregar a inicio); en esos
// browsers el botón no aparece, lo cual es OK.
export function InstallAppButton() {
  const t = useTranslations("install");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Si el user ya cliqueó "después" en una sesión previa, no molestar
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      // localStorage puede fallar en private mode; no es crítico
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault(); // evitamos el banner default de Chrome
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

  // No mostramos si no es instalable o si el user ya dijo "después"
  if (!deferred || dismissed) return null;

  async function handleInstall() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "dismissed") {
        // No insistir si ya dijo que no
        try {
          window.localStorage.setItem(DISMISS_KEY, "1");
        } catch {}
        setDismissed(true);
      }
    } catch (err) {
      console.warn("[install] prompt failed:", err);
    } finally {
      setDeferred(null);
    }
  }

  return (
    <Button
      onClick={handleInstall}
      variant="outline"
      size="sm"
      className="gap-1.5"
      aria-label={t("ariaLabel")}
    >
      <Download className="size-3.5" />
      <span className="hidden sm:inline">{t("label")}</span>
    </Button>
  );
}
