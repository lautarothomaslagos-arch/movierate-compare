"use client";

import { AlertTriangle, Check, Copy, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

// Error boundary global. Lo invoca Next cuando un error no manejado se
// propaga desde cualquier ruta. Tiene que ser Client Component porque
// usa onClick.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Logging estructurado — Vercel captura console.error en su dashboard
    // de Observability. Si en el futuro agregamos Sentry, este es el lugar.
    console.error("[GlobalError]", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      path: typeof window !== "undefined" ? window.location.pathname : null,
    });
  }, [error]);

  async function copyDigest() {
    if (!error.digest) return;
    try {
      await navigator.clipboard.writeText(error.digest);
      setCopied(true);
      toast.success("Copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <AlertTriangle className="size-12 text-destructive mb-4" />
      <h1 className="text-2xl font-bold">{t("error.title")}</h1>
      <p className="text-muted-foreground mt-2 max-w-md">{t("error.body")}</p>
      {error.digest && (
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground/80 font-mono bg-muted/30 border border-dashed rounded px-2.5 py-1">
          <span>ref: {error.digest}</span>
          <button
            onClick={copyDigest}
            className="hover:text-foreground transition-colors"
            aria-label="Copiar referencia"
          >
            {copied ? (
              <Check className="size-3" />
            ) : (
              <Copy className="size-3" />
            )}
          </button>
        </div>
      )}
      <div className="mt-6 flex gap-2">
        <Button onClick={reset} variant="default">
          <RefreshCw className="size-4" />
          {t("common.retry")}
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{t("common.backToHome")}</Link>
        </Button>
      </div>
    </main>
  );
}
