import { Film } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { MediaTypeToggle, type MediaType } from "@/components/MediaTypeToggle";
import {
  backdropUrl,
  discoverByGenre,
  discoverTvByGenre,
  getGenres,
  getTvGenres,
} from "@/lib/tmdb";

type Props = {
  searchParams: Promise<{ type?: string }>;
};

export const metadata = {
  title: "Géneros — MovieRate Compare",
  description: "Explorá películas y series por género.",
};

function parseType(value: string | undefined): MediaType {
  return value === "tv" ? "tv" : "movie";
}

export default async function GenerosPage({ searchParams }: Props) {
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
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Géneros</h1>
        <p className="text-sm text-muted-foreground">
          No se pudieron cargar los géneros. Probá refrescar la página.
        </p>
      </main>
    );
  }

  // Para cada género traemos backdrop de una opción popular para el fondo
  const withBackdrops = await Promise.all(
    genres.map(async (g) => {
      try {
        const res =
          mediaType === "tv"
            ? await discoverTvByGenre(g.id, 1)
            : await discoverByGenre(g.id, 1);
        const first = res.results[0];
        const backdrop = backdropUrl(first?.backdrop_path, "w780");
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
          <h1 className="text-2xl sm:text-3xl font-bold">Géneros</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Elegí un género y descubrí qué hay para ver.
          </p>
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
