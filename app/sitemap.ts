import type { MetadataRoute } from "next";

import { DECADE_KEYS } from "@/lib/decades";
import { SITE_URL } from "@/lib/seo";
import {
  discoverTopMovies,
  discoverTopTv,
  getGenres,
  getTvGenres,
  getTrending,
} from "@/lib/tmdb";

// Cacheamos el sitemap por 24h. Sin esto, cada request a /sitemap.xml
// dispara ~13 fetches a TMDB y Vercel mata la función por timeout.
// Google y otros crawlers reintentan diariamente — 24h es suficiente.
export const revalidate = 86400;

// Sitemap dinámico expandido — Fase H.1.
//
// Estrategia para que Google indexe el catálogo:
// - Estáticas: home + listings (top, generos, comparar, recomendador)
// - Top pelis + series: páginas 1-10 de cada (~200 entries por tipo)
// - Géneros movie + tv (todos los catálogos disponibles)
// - Decade picker para top (cada combinación type × decade)
// - Trending del día (cobertura de la actualidad)
//
// Cada URL se duplica por locale (es + en). Resultado ~1100 entries.
// Google permite hasta 50k por sitemap; vamos cómodos.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
      entries.push({
        url: `${SITE_URL}/${locale}${cleanPath}`,
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
    if (decade === "all") continue; // ya cubierto por /top base
    addEntry(`/top?decade=${decade}`, { priority: 0.7 });
    addEntry(`/top?type=tv&decade=${decade}`, { priority: 0.7 });
  }

  // ----- Géneros movie + tv (todos los catálogos) -----
  try {
    const [movieGenres, tvGenres] = await Promise.all([
      getGenres(),
      getTvGenres(),
    ]);
    for (const g of movieGenres.genres) {
      addEntry(`/genero/${g.id}`, { priority: 0.75 });
    }
    for (const g of tvGenres.genres) {
      addEntry(`/genero/${g.id}?type=tv`, { priority: 0.75 });
    }
  } catch (err) {
    console.warn("[sitemap] genres failed:", err);
  }

  // ----- Top pelis (páginas 1-5 → ~100 títulos) -----
  // Bajamos de 10 a 5 páginas: con 100 top movies + 100 top tv ya cubrimos
  // el catálogo "blue chip" para SEO. El resto se va a indexar a través de
  // links internos (cast de pelis populares, similares, etc).
  try {
    const moviePages = await Promise.all(
      [1, 2, 3, 4, 5].map((p) =>
        discoverTopMovies(p).catch(() => null)
      )
    );
    for (const page of moviePages) {
      if (!page) continue;
      for (const m of page.results) {
        addEntry(`/movie/${m.id}`, {
          priority: 0.85,
          changeFrequency: "monthly",
        });
      }
    }
  } catch (err) {
    console.warn("[sitemap] top movies failed:", err);
  }

  // ----- Top series (páginas 1-5) -----
  try {
    const tvPages = await Promise.all(
      [1, 2, 3, 4, 5].map((p) =>
        discoverTopTv(p).catch(() => null)
      )
    );
    for (const page of tvPages) {
      if (!page) continue;
      for (const t of page.results) {
        addEntry(`/serie/${t.id}`, {
          priority: 0.85,
          changeFrequency: "monthly",
        });
      }
    }
  } catch (err) {
    console.warn("[sitemap] top tv failed:", err);
  }

  // ----- Trending de la semana (cobertura de novedades) -----
  try {
    const trending = await getTrending("week");
    for (const item of trending.results.slice(0, 100)) {
      if (item.media_type === "movie") {
        addEntry(`/movie/${item.id}`, {
          priority: 0.9,
          changeFrequency: "weekly",
        });
      } else if (item.media_type === "tv") {
        addEntry(`/serie/${item.id}`, {
          priority: 0.9,
          changeFrequency: "weekly",
        });
      }
    }
  } catch (err) {
    console.warn("[sitemap] trending failed:", err);
  }

  // Dedup por URL (el trending puede solapar con top)
  const seen = new Set<string>();
  const deduped: MetadataRoute.Sitemap = [];
  for (const e of entries) {
    if (seen.has(e.url)) continue;
    seen.add(e.url);
    deduped.push(e);
  }

  return deduped;
}
