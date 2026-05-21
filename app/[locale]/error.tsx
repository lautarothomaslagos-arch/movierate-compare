"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

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

  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <AlertTriangle className="size-12 text-destructive mb-4" />
      <h1 className="text-2xl font-bold">{t("error.title")}</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        {t("error.body")}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground/60 mt-2 font-mono">
          ref: {error.digest}
        </p>
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
