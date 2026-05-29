import { ArrowRight, Film } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { backdropUrl, discoverByGenre, getGenres } from "@/lib/tmdb";

// Géneros destacados con sus IDs de TMDB (movie genres).
// El nombre viene de TMDB (respeta el locale del request gracias al
// TMDB_LANG dinámico). Si no hay nombre, caemos al fallback.
const FEATURED = [
  { id: 28, fallback: "Acción" },
  { id: 35, fallback: "Comedia" },
  { id: 18, fallback: "Drama" },
  { id: 27, fallback: "Terror" },
  { id: 10749, fallback: "Romance" },
  { id: 878, fallback: "Ciencia ficción" },
];

export async function FeaturedGenresSection() {
  const t = await getTranslations("home");

  // Fetch en paralelo: nombres de géneros en el locale activo + backdrop por género
  let genreNameById: Map<number, string> = new Map();
  try {
    const genresData = await getGenres();
    genreNameById = new Map(genresData.genres.map((g) => [g.id, g.name]));
  } catch {
    // si falla, usamos fallbacks
  }

  // Diversificación: TMDB devuelve la misma peli #1 trending en varios
  // géneros (ej. Mario Bros = Animación + Comedia + Familia). Filtramos
  // por candidatos con backdrop y elegimos uno por índice derivado del
  // genre.id para que cada card tenga imagen distinta.
  const withBackdrops = await Promise.all(
    FEATURED.map(async (g) => {
      try {
        const res = await discoverByGenre(g.id, 1);
        const candidates = res.results.filter((r) => r.backdrop_path);
        const chosen =
          candidates.length > 0
            ? candidates[g.id % candidates.length] ?? candidates[0]
            : null;
        const backdrop = backdropUrl(chosen?.backdrop_path ?? null, "w780");
        return {
          ...g,
          name: genreNameById.get(g.id) ?? g.fallback,
          backdrop,
        };
      } catch {
        return {
          ...g,
          name: genreNameById.get(g.id) ?? g.fallback,
          backdrop: null as string | null,
        };
      }
    })
  );

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {withBackdrops.map((g) => (
          <Link
            key={g.id}
            href={`/genero/${g.id}`}
            prefetch={false}
            className="group relative aspect-[16/10] rounded-lg overflow-hidden ring-1 ring-border transition-all hover:ring-2 hover:ring-primary/60 hover:-translate-y-0.5"
          >
            {g.backdrop ? (
              <Image
                src={g.backdrop}
                alt=""
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-muted flex items-center justify-center">
                <Film className="size-10 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex items-end justify-between p-3">
              <h3 className="font-serif italic font-normal text-lg sm:text-xl text-white drop-shadow tracking-tight">
                {g.name}
              </h3>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <Link
          href="/generos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("viewAllGenres")}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

export function FeaturedGenresSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[16/10] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
