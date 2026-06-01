"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

// Botón "Instalar app" para desktop. Mobile usa el item dentro de
// MobileNavMenu (ambos comparten el hook useInstallPrompt).
export function InstallAppButton() {
  const t = useTranslations("install");
  const { canInstall, install } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <Button
      onClick={install}
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
