"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

// Toaster que sigue el theme actual (light/dark). Lo separamos en su propio
// componente client porque useTheme es hook de cliente.
export function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  const theme =
    resolvedTheme === "light" ? "light" : "dark"; // fallback dark si aún no se resolvió

  return <Toaster theme={theme} position="top-right" richColors />;
}
