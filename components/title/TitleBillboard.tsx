import { Film } from "lucide-react";
import Image from "next/image";

import { posterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

// Billboard del título — Fase G.1.
// Layout editorial: poster a la izq (compacto), info + título serif italic
// + bloque de weighted average a la derecha. Diseñado para vivir SOBRE el
// fold de /movie/[id] y /serie/[id].
//
// El bloque del weighted score viene como children — server component async
// que llega via streaming con su propio Suspense fallback.
export function TitleBillboard({
  title,
  originalTitle,
  posterPath,
  posterPriority = true,
  eyebrow,
  children,
}: {
  title: string;
  originalTitle?: string | null;
  posterPath: string | null;
  posterPriority?: boolean;
  // String con géneros · año · runtime, ya armado por la page.
  eyebrow: string;
  // Slot para WeightedScoreHero (server component que llega por streaming).
  children?: React.ReactNode;
}) {
  const poster = posterUrl(posterPath, "w500");

  return (
    <section
      className={cn(
        "grid items-start gap-6 md:gap-8",
        "grid-cols-[120px_1fr] md:grid-cols-[200px_1fr]"
      )}
    >
      {/* Poster compacto — ya no domina, ahora acompaña */}
      <div className="relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border shadow-[var(--shadow-2)]">
        {poster ? (
          <Image
            src={poster}
            alt={`Afiche de ${title}`}
            fill
            priority={posterPriority}
            sizes="(min-width: 768px) 200px, 120px"
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Film className="size-8 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info — eyebrow mono, título serif italic, slot weighted score */}
      <div className="min-w-0">
        <p
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground",
            "line-clamp-1"
          )}
        >
          {eyebrow}
        </p>

        <h1
          className={cn(
            "font-serif italic font-normal mt-1.5 sm:mt-2 text-balance",
            // Fluid scale: en 320px arranca ~36px, en >=768px sube a ~72px
            "text-[clamp(2.25rem,4.5vw+0.5rem,4.5rem)] leading-[0.95] tracking-tight"
          )}
        >
          {title}
          <span className="text-primary not-italic">.</span>
        </h1>

        {originalTitle && originalTitle !== title && (
          <p className="text-xs sm:text-sm text-muted-foreground italic mt-1.5">
            {originalTitle}
          </p>
        )}

        {/* Slot del weighted score — viene por streaming */}
        {children && (
          <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-border/60">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
