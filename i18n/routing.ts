import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  // "as-needed": muestra prefijo solo para non-default locales.
  // Cambié a "always" para que ambos siempre tengan prefijo (más SEO friendly
  // y compartible — /es/movie/1 y /en/movie/1).
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
