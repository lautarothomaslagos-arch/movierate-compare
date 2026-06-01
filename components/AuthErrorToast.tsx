"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

// Si el callback de OAuth falla, el flujo nos devuelve a /?error=XXX
// (puede ser auth_callback_failed propio, o un error_code que mande Google
// como "invalid_request" cuando el PKCE state vence o no matchea).
// Mostramos un toast UNA vez y LIMPIAMOS el param de la URL — de lo
// contrario el toast vuelve a salir cada vez que el user recarga o navega.
export function AuthErrorToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const err = params.get("error");
  const t = useTranslations("auth");

  useEffect(() => {
    if (!err) return;

    if (err === "auth_callback_failed") {
      toast.error(t("callbackFailed"));
    } else {
      toast.error(`Error: ${err}`);
    }

    // Limpiamos los params relacionados al error y reescribimos la URL
    // SIN forzar scroll. Conservamos el resto de la query string (ej.
    // ?focus=search del manifest shortcut).
    const next = new URLSearchParams(params.toString());
    next.delete("error");
    next.delete("error_code");
    next.delete("error_description");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [err, t, params, router, pathname]);

  return null;
}
