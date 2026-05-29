import { Film } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getTrending, getYear } from "@/lib/tmdb";

type TrendingItem = {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
  overview: string | null;
};

// Trending de hoy — Fase G.2: primer item con tratamiento editorial
// (poster grande + sinopsis al lado), el resto como carrousel horizontal.
export async function TrendingSection({ limit = 12 }: { limit?: number }) {
  const t = await getTranslations();
  let items: TrendingItem[] = [];
  try {
    const trending = await getTrending("day");
    items = trending.results
      .filter(
        (r): r is Extract<typeof r, { media_type: "movie" | "tv" }> =>
          r.media_type === "movie" || r.media_type === "tv"
      )
      .slice(0, limit)
      .map((r) => {
        if (r.media_type === "movie") {
          return {
            id: r.id,
            media_type: "movie" as const,
            title: r.title,
            year: getYear(r.release_date),
            poster_path: r.poster_path ?? null,
            overview: r.overview ?? null,
          };
        }
        return {
          id: r.id,
          media_type: "tv" as const,
          title: r.name,
          year: getYear(r.first_air_date),
          poster_path: r.poster_path ?? null,
          overview: r.overview ?? null,
        };
      });
  } catch (err) {
    console.warn("[TrendingSection] failed:", err);
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("home.trendingFailed")}
      </p>
    );
  }

  const [featured, ...rest] = items;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Featured: el #1 trending. Layout editorial con poster mediano +
          sinopsis serif italic al costado (en desktop). En mobile apilado. */}
      <FeaturedCard item={featured} mediaLabels={getMediaLabels(t)} />

      {/* Resto: carrousel horizontal como antes */}
      {rest.length > 0 && (
        <ul
          className={cn(
            "flex gap-3 overflow-x-auto pb-2",
            "[scroll-snap-type:x_proximity] md:[scroll-snap-type:x_mandatory]",
            "scroll-smooth -mx-4 sm:mx-0 px-4 sm:px-0"
          )}
          style={{ scrollbarWidth: "thin" }}
        >
          {rest.map((it) => (
            <PosterCard key={`${it.media_type}-${it.id}`} item={it} t={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

function getMediaLabels(t: Awaited<ReturnType<typeof getTranslations>>): {
  movie: string;
  tv: string;
} {
  return {
    movie: t("search.badgeMovie"),
    tv: t("search.badgeTv"),
  };
}

// Card destacada — el primer trending. Poster a la izq, info editorial a
// la derecha (eyebrow mono + título serif italic + sinopsis truncada).
function FeaturedCard({
  item,
  mediaLabels,
}: {
  item: TrendingItem;
  mediaLabels: { movie: string; tv: string };
}) {
  const href =
    item.media_type === "tv" ? `/serie/${item.id}` : `/movie/${item.id}`;
  const label =
    item.media_type === "tv" ? mediaLabels.tv : mediaLabels.movie;

  return (
    <Link
      href={href}
      prefetch={false}
      className="block group rounded-lg ring-1 ring-border bg-card overflow-hidden transition-shadow hover:shadow-[var(--shadow-1)]"
    >
      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[180px_1fr] gap-4 sm:gap-6 p-3 sm:p-4">
        {/* Poster destacado */}
        <div className="relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border shadow-[var(--shadow-1)] transition-transform group-hover:-translate-y-0.5">
          {item.poster_path ? (
            <Image
              src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
              alt={`Afiche de ${item.title}`}
              fill
              sizes="(min-width: 640px) 180px, 120px"
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Film className="size-10 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info editorial */}
        <div className="min-w-0 flex flex-col justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2">
              <span className="inline-block size-1.5 rounded-full bg-primary" />
              {label}
              {item.year !== null && <span>· {item.year}</span>}
            </p>
            <h3
              className={cn(
                "font-serif italic font-normal mt-2 leading-tight",
                "text-2xl sm:text-3xl md:text-4xl tracking-tight text-balance",
                "group-hover:text-primary transition-colors"
              )}
            >
              {item.title}
            </h3>
            {item.overview && (
              <p className="mt-3 text-sm text-muted-foreground/90 line-clamp-3 sm:line-clamp-4 leading-relaxed max-w-prose">
                {item.overview}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Card chica del carrousel — diseño original mejorado con paleta brass.
function PosterCard({
  item,
  t,
}: {
  item: TrendingItem;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const href =
    item.media_type === "tv" ? `/serie/${item.id}` : `/movie/${item.id}`;

  return (
    <li className="shrink-0 w-32 sm:w-36 md:w-40 snap-start">
      <Link href={href} className="group block" prefetch={false}>
        <div className="poster-frame relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border group-hover:ring-primary/60">
          {item.poster_path ? (
            <Image
              src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
              alt={`Afiche de ${item.title}`}
              fill
              sizes="(min-width: 768px) 160px, (min-width: 640px) 144px, 128px"
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Film className="size-8 text-muted-foreground" />
            </div>
          )}
          <span
            className={cn(
              "absolute top-1.5 left-1.5 inline-block px-1.5 py-0.5 rounded font-mono text-[9px] tracking-[0.12em] uppercase shadow",
              item.media_type === "tv"
                ? "bg-purple-500/90 text-white"
                : "bg-blue-500/90 text-white"
            )}
          >
            {item.media_type === "tv"
              ? t("search.badgeTv")
              : t("search.badgeMovie")}
          </span>
        </div>
        <div className="mt-1.5 text-xs font-medium truncate">{item.title}</div>
        {item.year !== null && (
          <div className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground">
            {item.year}
          </div>
        )}
      </Link>
    </li>
  );
}

export function TrendingSectionSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Featured skeleton */}
      <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[180px_1fr] gap-4 sm:gap-6 p-3 sm:p-4 rounded-lg ring-1 ring-border bg-card">
        <Skeleton className="aspect-[2/3] rounded-md" />
        <div className="space-y-2.5">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-3 w-full mt-3" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>
      {/* Carrousel skeleton */}
      <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-hidden pb-2">
        <div className="flex gap-3">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="shrink-0 w-32 sm:w-36 md:w-40">
              <Skeleton className="aspect-[2/3] rounded-md" />
              <Skeleton className="mt-1.5 h-3 w-3/4" />
              <Skeleton className="mt-1 h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
