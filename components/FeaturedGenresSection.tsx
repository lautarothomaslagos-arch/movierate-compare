import { ArrowRight, Film } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { backdropUrl, discoverByGenre } from "@/lib/tmdb";

// Géneros destacados con sus IDs de TMDB (movie genres).
// Mantenemos esta lista hardcoded — son los más visitados y le da personalidad
// a la home. La lista completa de géneros sigue en /generos.
const FEATURED = [
  { id: 28, name: "Acción", emoji: "💥" },
  { id: 35, name: "Comedia", emoji: "😂" },
  { id: 18, name: "Drama", emoji: "🎭" },
  { id: 27, name: "Terror", emoji: "👻" },
  { id: 10749, name: "Romance", emoji: "💘" },
  { id: 878, name: "Ciencia ficción", emoji: "🛸" },
];

export async function FeaturedGenresSection() {
  // Fetch en paralelo de un backdrop por género (de la peli más popular)
  const withBackdrops = await Promise.all(
    FEATURED.map(async (g) => {
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
          Ver todos los géneros
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
