import { ArrowRight, Film } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { backdropUrl, discoverByGenre, getGenres } from "@/lib/tmdb";

// Géneros destacados con sus IDs de TMDB (movie genres) + emoji.
// El nombre viene de TMDB (respeta el locale del request gracias al
// TMDB_LANG dinámico). Si no hay nombre, caemos al fallback.
const FEATURED = [
  { id: 28, fallback: "Acción", emoji: "💥" },
  { id: 35, fallback: "Comedia", emoji: "😂" },
  { id: 18, fallback: "Drama", emoji: "🎭" },
  { id: 27, fallback: "Terror", emoji: "👻" },
  { id: 10749, fallback: "Romance", emoji: "💘" },
  { id: 878, fallback: "Ciencia ficción", emoji: "🛸" },
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

  const withBackdrops = await Promise.all(
    FEATURED.map(async (g) => {
      try {
        const res = await discoverByGenre(g.id, 1);
        const first = res.results[0];
        const backdrop = backdropUrl(first?.backdrop_path, "w780");
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
              <h3 className="text-sm sm:text-base font-semibold text-white drop-shadow inline-flex items-center gap-1.5">
                <span aria-hidden>{g.emoji}</span>
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
