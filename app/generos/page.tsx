import { Film } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { backdropUrl, discoverByGenre, getGenres } from "@/lib/tmdb";

export const metadata = {
  title: "Géneros — MovieRate Compare",
  description: "Explorá películas por género: Acción, Terror, Comedia y más.",
};

// Lista de géneros con backdrop de una peli popular del género de fondo.
// Hacemos los fetches de backdrops en paralelo.
export default async function GenerosPage() {
  let genres;
  try {
    const data = await getGenres();
    genres = data.genres;
  } catch (err) {
    console.error("[/generos] getGenres failed:", err);
    return (
      <main className="px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Géneros</h1>
        <p className="text-sm text-muted-foreground">
          No se pudieron cargar los géneros. Probá refrescar la página.
        </p>
      </main>
    );
  }

  // Para cada género, traemos la peli más popular para usar su backdrop.
  // Promise.allSettled — si alguno falla, ese género va sin backdrop.
  const withBackdrops = await Promise.all(
    genres.map(async (g) => {
      try {
        const res = await discoverByGenre(g.id, 1);
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
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Géneros</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Elegí un género y descubrí qué hay para ver.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {withBackdrops.map((g) => (
          <Link
            key={g.id}
            href={`/genero/${g.id}`}
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
            {/* Overlay para legibilidad del texto */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex items-end p-3">
              <h2 className="text-base sm:text-lg font-semibold text-white drop-shadow">
                {g.name}
              </h2>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
