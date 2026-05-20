import { ArrowLeft, ChevronLeft, ChevronRight, Film } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { discoverByGenre, getGenres, getYear, posterUrl } from "@/lib/tmdb";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const genreId = parseInt(id, 10);
  if (!Number.isFinite(genreId)) return { title: "MovieRate Compare" };
  try {
    const data = await getGenres();
    const genre = data.genres.find((g) => g.id === genreId);
    if (!genre) return { title: "MovieRate Compare" };
    return {
      title: `${genre.name} — MovieRate Compare`,
      description: `Películas del género ${genre.name} ordenadas por popularidad.`,
    };
  } catch {
    return { title: "MovieRate Compare" };
  }
}

export default async function GeneroPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const genreId = parseInt(id, 10);
  if (!Number.isFinite(genreId)) notFound();

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  // Fetch en paralelo del género (para el título) + las pelis de la página
  let genreName = "Género";
  let movies;
  let totalPages = 1;
  try {
    const [genresData, discover] = await Promise.all([
      getGenres(),
      discoverByGenre(genreId, page),
    ]);
    const found = genresData.genres.find((g) => g.id === genreId);
    if (!found) notFound();
    genreName = found.name;
    movies = discover.results;
    // TMDB capea total_pages a 500 en discover
    totalPages = Math.min(discover.total_pages, 500);
  } catch {
    notFound();
  }

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <main className="px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
      <Link
        href="/generos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ArrowLeft className="size-4" />
        Todos los géneros
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{genreName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Página {page} de {totalPages.toLocaleString("es-AR")} · ordenado por popularidad
        </p>
      </header>

      {movies.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No encontramos películas para esta página.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {movies.map((m) => {
            const poster = posterUrl(m.poster_path, "w342");
            const year = getYear(m.release_date);
            return (
              <Link
                key={m.id}
                href={`/movie/${m.id}`}
                className="group block"
                prefetch={false}
              >
                <div className="relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border transition-all group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-primary/60">
                  {poster ? (
                    <Image
                      src={poster}
                      alt={`Poster de ${m.title}`}
                      fill
                      sizes="(min-width: 768px) 192px, (min-width: 640px) 160px, 30vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Film className="size-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="mt-1.5 text-xs font-medium truncate">
                  {m.title}
                </div>
                {year !== null && (
                  <div className="text-xs text-muted-foreground">{year}</div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {(hasPrev || hasNext) && (
        <nav
          className="mt-8 flex items-center justify-between gap-3"
          aria-label="Paginación"
        >
          <Button asChild variant="outline" size="sm" disabled={!hasPrev}>
            {hasPrev ? (
              <Link
                href={`/genero/${genreId}?page=${page - 1}`}
                prefetch={false}
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Link>
            ) : (
              <span>
                <ChevronLeft className="size-4" />
                Anterior
              </span>
            )}
          </Button>

          <span className="text-xs text-muted-foreground">
            {page} / {totalPages.toLocaleString("es-AR")}
          </span>

          <Button asChild variant="outline" size="sm" disabled={!hasNext}>
            {hasNext ? (
              <Link
                href={`/genero/${genreId}?page=${page + 1}`}
                prefetch={false}
              >
                Siguiente
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span>
                Siguiente
                <ChevronRight className="size-4" />
              </span>
            )}
          </Button>
        </nav>
      )}
    </main>
  );
}
