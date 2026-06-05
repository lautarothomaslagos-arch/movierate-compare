import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { BrandStar } from "@/components/BrandStar";
import { computeWeightedAverage } from "@/components/RatingsAverage";
import { Link } from "@/i18n/navigation";
import { getRatings } from "@/lib/ratings";
import { getMovieDetails, getTrending, getTvDetails, getYear } from "@/lib/tmdb";
import { getTvRatings } from "@/lib/tv-ratings";
import { cn } from "@/lib/utils";

// "Peli del día" — sección editorial sobre el fold. Elige UN título del
// trending day usando day-of-year como seed → mismo título para todos los
// users el mismo día, cambia al día siguiente. Layout:
//   - Backdrop blureado de fondo
//   - Lado izquierdo: poster pequeño
//   - Lado derecho: eyebrow + título serif italic + año/género + brand
//     star llena al weighted average + body editorial + CTA
//
// Performance: getTrending y getRatings ya tienen sus respectivas capas
// de cache (React.cache + Supabase ratings_cache 7d).

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// El prop `greeting` permite reusar este componente como hero para usuarios
// logueados — el saludo personalizado va en el eyebrow ("DE VUELTA, LAUTARO ·
// PELI DEL DÍA") y el card queda como fold inicial en lugar de aparecer
// abajo después de "Recientes". Para anónimos se omite y va sin saludo.
export async function FeaturedDailySection({
  greeting,
}: {
  greeting?: string;
} = {}) {
  const t = await getTranslations("home");

  try {
    const trending = await getTrending("day");
    // Filtramos solo movies/tv que tengan backdrop (necesitamos visual fuerte)
    const candidates = trending.results.filter(
      (it) =>
        (it.media_type === "movie" || it.media_type === "tv") &&
        !!it.backdrop_path &&
        !!it.poster_path
    );
    if (candidates.length === 0) return null;

    // Pick determinístico: día del año modulo lista
    const idx = dayOfYear(new Date()) % candidates.length;
    const pick = candidates[idx];

    // Cargamos detalles + ratings en paralelo
    const isMovie = pick.media_type === "movie";
    if (!isMovie && pick.media_type !== "tv") return null;

    const [details, ratings] = await Promise.all([
      isMovie ? getMovieDetails(pick.id) : getTvDetails(pick.id),
      isMovie ? getRatings(pick.id) : getTvRatings(pick.id),
    ]);

    const avg = computeWeightedAverage(ratings);
    const fillPct = avg
      ? Math.max(0, Math.min(1, avg.score10 / 10))
      : 0.74;

    const title = isMovie
      ? (details as { title: string }).title
      : (details as { name: string }).name;
    const year = getYear(
      isMovie
        ? (details as { release_date?: string | null }).release_date
        : (details as { first_air_date?: string | null }).first_air_date
    );
    const genre =
      (details as { genres?: Array<{ name: string }> }).genres?.[0]?.name ??
      null;
    const overview =
      (details as { overview?: string | null }).overview?.slice(0, 220) ?? "";
    const href = isMovie ? `/movie/${pick.id}` : `/serie/${pick.id}`;

    return (
      <section className="relative overflow-hidden rounded-xl border border-border/40 bg-card">
        {/* Backdrop blureado */}
        <div className="absolute inset-0 -z-10">
          <Image
            src={`https://image.tmdb.org/t/p/w1280${pick.backdrop_path}`}
            alt=""
            fill
            sizes="(min-width: 1024px) 960px, 100vw"
            className="object-cover opacity-30 blur-md scale-110"
            priority={false}
          />
          {/* Capa de gradiente warm para asegurar legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/60" />
        </div>

        <div className="relative grid grid-cols-[auto_1fr] gap-4 sm:gap-6 p-4 sm:p-6 md:p-8 items-center">
          {/* Poster */}
          <Link
            href={href}
            className="relative w-24 sm:w-32 md:w-40 aspect-[2/3] rounded-lg overflow-hidden ring-1 ring-border/60 shrink-0 group"
          >
            <Image
              src={`https://image.tmdb.org/t/p/w342${pick.poster_path}`}
              alt={`Poster ${title}`}
              fill
              sizes="(min-width: 768px) 160px, 96px"
              className="object-cover transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Contenido */}
          <div className="min-w-0 flex flex-col gap-2 sm:gap-3">
            <p
              className={cn(
                "inline-flex flex-wrap items-center gap-x-2 gap-y-1",
                "font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-primary"
              )}
            >
              <span className="inline-block size-1.5 rounded-full bg-primary" />
              {greeting && (
                <>
                  <span className="text-foreground">{greeting}</span>
                  <span className="opacity-50" aria-hidden="true">
                    ·
                  </span>
                </>
              )}
              <span>{t("dailyEyebrow")}</span>
            </p>

            <Link href={href} className="block group">
              <h2 className="font-serif italic font-normal leading-[0.95] tracking-tight text-balance text-[clamp(1.5rem,3.5vw+0.5rem,2.75rem)] group-hover:text-primary transition-colors">
                {title}
              </h2>
            </Link>

            {(year !== null || genre) && (
              <div className="text-xs sm:text-sm text-muted-foreground font-mono uppercase tracking-[0.14em] flex flex-wrap gap-2 items-center">
                {year !== null && <span>{year}</span>}
                {year !== null && genre && <span className="opacity-50">·</span>}
                {genre && <span>{genre}</span>}
              </div>
            )}

            {avg && (
              <div className="inline-flex items-center gap-2 self-start mt-1">
                <span className="text-foreground/90">
                  <BrandStar size={28} fillPct={fillPct} />
                </span>
                <span className="font-serif italic font-normal text-2xl sm:text-3xl tabular-nums text-primary leading-none">
                  {avg.score10.toFixed(1)}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground tracking-normal">
                  /10
                </span>
              </div>
            )}

            {overview && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-4 max-w-prose mt-1">
                {overview}
              </p>
            )}

            <Link
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 self-start mt-1",
                "text-xs sm:text-sm font-medium text-primary hover:underline"
              )}
            >
              {t("dailyCta")}
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>
    );
  } catch (err) {
    console.warn("[FeaturedDailySection] failed:", err);
    return null;
  }
}

export function FeaturedDailySkeleton() {
  return (
    <section className="rounded-xl border border-border/40 bg-card p-4 sm:p-6 md:p-8">
      <div className="grid grid-cols-[auto_1fr] gap-4 sm:gap-6">
        <div className="w-24 sm:w-32 md:w-40 aspect-[2/3] rounded-lg skeleton-warm" />
        <div className="space-y-3 min-w-0">
          <div className="h-3 w-24 rounded skeleton-warm" />
          <div className="h-8 sm:h-10 w-3/4 rounded skeleton-warm" />
          <div className="h-3 w-32 rounded skeleton-warm" />
          <div className="h-6 w-20 rounded skeleton-warm" />
          <div className="space-y-1.5 mt-2">
            <div className="h-3 w-full rounded skeleton-warm" />
            <div className="h-3 w-5/6 rounded skeleton-warm" />
            <div className="h-3 w-4/6 rounded skeleton-warm" />
          </div>
        </div>
      </div>
    </section>
  );
}
