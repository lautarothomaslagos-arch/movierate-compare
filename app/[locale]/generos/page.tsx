import { Film } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";

import { MediaTypeToggle, type MediaType } from "@/components/MediaTypeToggle";
import { Link } from "@/i18n/navigation";
import {
  backdropUrl,
  discoverByGenre,
  discoverTvByGenre,
  getGenres,
  getTvGenres,
} from "@/lib/tmdb";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
};

export const metadata = {
  title: "Géneros — MovieRate Compare",
  description: "Explorá películas y series por género.",
};

function parseType(value: string | undefined): MediaType {
  return value === "tv" ? "tv" : "movie";
}

export default async function GenerosPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("genres");
  const { type: typeParam } = await searchParams;
  const mediaType = parseType(typeParam);

  let genres;
  try {
    const data = mediaType === "tv" ? await getTvGenres() : await getGenres();
    genres = data.genres;
  } catch (err) {
    console.error("[/generos] failed:", err);
    return (
      <main className="px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
        <h1 className="font-serif italic font-normal text-3xl sm:text-4xl leading-[0.95] tracking-tight text-balance mb-6">{t("heading")}</h1>
        <p className="text-sm text-muted-foreground">{t("loadFailed")}</p>
      </main>
    );
  }

  // Para no repetir la misma imagen entre géneros (TMDB devuelve pelis
  // que cubren varios géneros como #1, ej: Mario Bros aparece en
  // Animación, Comedia, Familia, Fantasía…), filtramos items con
  // backdrop y elegimos uno por índice derivado del id del género.
  // Eso diversifica las cards sin perder representatividad.
  const withBackdrops = await Promise.all(
    genres.map(async (g) => {
      try {
        const res =
          mediaType === "tv"
            ? await discoverTvByGenre(g.id, 1)
            : await discoverByGenre(g.id, 1);
        const candidates = res.results.filter((r) => r.backdrop_path);
        if (candidates.length === 0) {
          return { ...g, backdrop: null as string | null };
        }
        // Índice determinístico distinto por género — usamos el id como
        // semilla. Así nunca dos géneros caen en la misma posición.
        const idx = g.id % candidates.length;
        const chosen = candidates[idx] ?? candidates[0];
        const backdrop = backdropUrl(chosen.backdrop_path, "w780");
        return { ...g, backdrop };
      } catch {
        return { ...g, backdrop: null as string | null };
      }
    })
  );

  return (
    <main className="px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-serif italic font-normal text-3xl sm:text-4xl leading-[0.95] tracking-tight text-balance">{t("heading")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <MediaTypeToggle basePath="/generos" active={mediaType} />
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {withBackdrops.map((g) => {
          const href =
            mediaType === "tv"
              ? `/genero/${g.id}?type=tv`
              : `/genero/${g.id}`;
          return (
            <Link
              key={g.id}
              href={href}
              prefetch={false}
              className="group relative aspect-[16/9] rounded-lg overflow-hidden ring-1 ring-border transition-all hover:ring-2 hover:ring-primary/60 hover:-translate-y-0.5"
            >
              {g.backdrop ? (
                <Image
                  src={g.backdrop}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 240px, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <Film className="size-10 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex items-end p-3">
                <h2 className="text-base sm:text-lg font-semibold text-white drop-shadow">
                  {g.name}
                </h2>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
