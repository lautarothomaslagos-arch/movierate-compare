import type { MetadataRoute } from "next";

import { DECADE_KEYS } from "@/lib/decades";
import { SITE_URL } from "@/lib/seo";

// Sitemap estático — Fase H.1.
//
// Listamos solo URLs "core" (home, listings, decade picker, géneros más
// populares hardcoded). NO hacemos fetches a TMDB — la primera carga
// tiene que ser instantánea para que GSC no le tire timeout.
//
// Google descubre el resto de pelis/series via los links internos de la
// app (cast, similares, trending) — lo que técnicamente se llama
// "discovery via crawl".
//
// Cache 24h por las dudas (cambian fechas de lastmod).
export const revalidate = 86400;

// IDs hardcoded de géneros de movies + tv en TMDB. Sin esto tendríamos
// que llamar a TMDB en cada sitemap. Estos IDs son estables.
const MOVIE_GENRE_IDS = [
  28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878,
  10770, 53, 10752, 37,
];

const TV_GENRE_IDS = [
  10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10763, 10764, 10765, 10766,
  10767, 10768, 37,
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const locales = ["es", "en"] as const;

  const entries: MetadataRoute.Sitemap = [];

  function addEntry(
    path: string,
    opts: {
      priority?: number;
      changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
    } = {}
  ) {
    for (const locale of locales) {
      const cleanPath = path === "/" ? "" : path;
      // Escapar & → &amp; para XML válido (URLs con query strings).
      const rawUrl = `${SITE_URL}/${locale}${cleanPath}`;
      const url = rawUrl.replace(/&/g, "&amp;");
      entries.push({
        url,
        lastModified: now,
        changeFrequency: opts.changeFrequency ?? "weekly",
        priority: opts.priority ?? 0.7,
      });
    }
  }

  // ----- Estáticas -----
  addEntry("/", { priority: 1.0, changeFrequency: "daily" });
  addEntry("/generos", { priority: 0.8 });
  addEntry("/generos?type=tv", { priority: 0.8 });
  addEntry("/top", { priority: 0.9, changeFrequency: "daily" });
  addEntry("/top?type=tv", { priority: 0.9, changeFrequency: "daily" });
  addEntry("/comparar", { priority: 0.6 });
  addEntry("/recomendador", { priority: 0.6 });

  // ----- Decade picker en /top (cada combinación type × decade) -----
  for (const decade of DECADE_KEYS) {
    if (decade === "all") continue;
    addEntry(`/top?decade=${decade}`, { priority: 0.7 });
    addEntry(`/top?type=tv&decade=${decade}`, { priority: 0.7 });
  }

  // ----- Géneros movie + tv (hardcoded IDs) -----
  for (const id of MOVIE_GENRE_IDS) {
    addEntry(`/genero/${id}`, { priority: 0.75 });
  }
  for (const id of TV_GENRE_IDS) {
    addEntry(`/genero/${id}?type=tv`, { priority: 0.75 });
  }

  return entries;
}
