"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

// Si el callback de OAuth falla redirige a /?error=auth_callback_failed.
// Este componente muestra un toast en ese caso. Cliente-side porque
// useSearchParams es hook de cliente.
export function AuthErrorToast() {
  const params = useSearchParams();
  const err = params.get("error");
  const t = useTranslations("auth");

  useEffect(() => {
    if (!err) return;
    if (err === "auth_callback_failed") {
      toast.error(t("callbackFailed"));
    } else {
      toast.error(`Error: ${err}`);
    }
  }, [err, t]);

  return null;
}
