import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";
import { getTrending } from "@/lib/tmdb";

// Sitemap dinámico:
// - URLs estáticas: home, /generos (movie + tv), /top (movie + tv), /comparar
// - URLs dinámicas: top 100 trending de la semana (movies + tv)
//
// Se regenera con ISR (revalidate diario via tmdbFetch que cachea 1h).
// Limitamos a 200 entries para no explotar el sitemap (Google sugiere 50k máx).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const locales = ["es", "en"];

  const staticEntries: MetadataRoute.Sitemap = [];

  // Home + páginas estáticas, una entry por locale
  const staticPaths = [
    "/",
    "/generos",
    "/generos?type=tv",
    "/top",
    "/top?type=tv",
    "/comparar",
  ];
  for (const locale of locales) {
    for (const path of staticPaths) {
      staticEntries.push({
        url: `${SITE_URL}/${locale}${path === "/" ? "" : path}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: path === "/" ? 1.0 : 0.7,
      });
    }
  }

  // Dinámicas: top trending de la semana (movies + tv mezclados)
  const dynamicEntries: MetadataRoute.Sitemap = [];
  try {
    const trending = await getTrending("week");
    for (const item of trending.results.slice(0, 100)) {
      if (item.media_type === "movie" || item.media_type === "tv") {
        const prefix = item.media_type === "tv" ? "serie" : "movie";
        // Una entry por locale
        for (const locale of locales) {
          dynamicEntries.push({
            url: `${SITE_URL}/${locale}/${prefix}/${item.id}`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.8,
          });
        }
      }
    }
  } catch (err) {
    console.warn("[sitemap] trending failed:", err);
  }

  return [...staticEntries, ...dynamicEntries];
}
