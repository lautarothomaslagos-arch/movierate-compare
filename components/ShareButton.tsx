"use client";

import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

// Botón "Compartir". Usa Web Share API si está disponible (mobile),
// si no copia el link al clipboard como fallback.
export function ShareButton({
  title,
  text,
}: {
  title: string;
  text?: string;
}) {
  const t = useTranslations("share");
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      const url = window.location.href;
      const data: ShareData = { title, url };
      if (text) data.text = text;

      // Web Share API si está disponible (mobile + Safari desktop)
      if (typeof navigator.share === "function") {
        try {
          await navigator.share(data);
          // No mostramos toast — el sistema ya muestra feedback nativo
          return;
        } catch (err) {
          // User canceló el share — no error
          if (
            err instanceof Error &&
            err.name === "AbortError"
          ) {
            return;
          }
          // Si fallo por otro motivo, caemos al clipboard fallback
        }
      }

      // Fallback: copiar al clipboard
      await navigator.clipboard.writeText(url);
      toast.success(t("copied"));
    } catch (err) {
      console.warn("[share] failed:", err);
      toast.error(t("failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      disabled={loading}
    >
      <Share2 className="size-4" />
      {t("share")}
    </Button>
  );
}
