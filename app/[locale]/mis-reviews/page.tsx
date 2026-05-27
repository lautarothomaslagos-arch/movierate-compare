import { Film, Star, Tv } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";

import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getMyReviews } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Filter = "all" | "movie" | "tv";
type Sort = "recent" | "best" | "worst";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string; sort?: string }>;
};

function parseFilter(value: string | undefined): Filter {
  if (value === "movie" || value === "tv") return value;
  return "all";
}

function parseSort(value: string | undefined): Sort {
  if (value === "best" || value === "worst") return value;
  return "recent";
}

export async function generateMetadata({ params }: Props) {
  const { locale: _ } = await params;
  void _;
  return {
    title: "Mis reviews — MovieRate Compare",
    description: "Tus puntajes y notas privadas de pelis y series.",
  };
}

export default async function MyReviewsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { filter: filterParam, sort: sortParam } = await searchParams;
  const t = await getTranslations("myReviews");

  const filter = parseFilter(filterParam);
  const sort = parseSort(sortParam);

  // Si no hay sesión, mostrar CTA login (no rompemos por RLS pero
  // damos un mensaje explícito)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="px-4 sm:px-6 py-12 max-w-3xl mx-auto w-full text-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {t("heading")}
        </h1>
        <Card className="mt-8 p-8 border-dashed">
          <Star className="size-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("loginRequired")}</p>
        </Card>
      </main>
    );
  }

  // Reviews del user — ya snapshotean título/year/poster
  const allReviews = await getMyReviews(500);

  // Aplicar filtro
  const filtered = allReviews.filter((r) => {
    if (filter === "all") return true;
    return r.media_type === filter;
  });

  // Aplicar orden
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "best") return b.rating - a.rating;
    if (sort === "worst") return a.rating - b.rating;
    // recent (default): por created_at desc (ya viene así de getMyReviews,
    // pero el filtro pudo haber roto el orden, igual mantenemos)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Helper para armar URLs preservando el otro param
  function buildHref(opts: { filter?: Filter; sort?: Sort }): string {
    const sp = new URLSearchParams();
    const f = opts.filter ?? filter;
    const s = opts.sort ?? sort;
    if (f !== "all") sp.set("filter", f);
    if (s !== "recent") sp.set("sort", s);
    const qs = sp.toString();
    return `/mis-reviews${qs ? `?${qs}` : ""}`;
  }

  return (
    <main className="px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight inline-flex items-center gap-2">
          <Star className="size-6 sm:size-7 text-amber-400 fill-amber-400" />
          {t("heading")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {allReviews.length === 1
            ? t("countOne", { count: 1 })
            : t("countOther", { count: allReviews.length })}
        </p>
      </header>

      {/* Filtros + sort */}
      {allReviews.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <FilterPill
            active={filter === "all"}
            href={buildHref({ filter: "all" })}
            label={t("filterAll")}
          />
          <FilterPill
            active={filter === "movie"}
            href={buildHref({ filter: "movie" })}
            label={t("filterMovies")}
            icon={<Film className="size-3.5" />}
          />
          <FilterPill
            active={filter === "tv"}
            href={buildHref({ filter: "tv" })}
            label={t("filterTv")}
            icon={<Tv className="size-3.5" />}
          />

          <div className="ml-auto flex gap-1.5">
            <SortPill
              active={sort === "recent"}
              href={buildHref({ sort: "recent" })}
              label={t("sortRecent")}
            />
            <SortPill
              active={sort === "best"}
              href={buildHref({ sort: "best" })}
              label={t("sortBest")}
            />
            <SortPill
              active={sort === "worst"}
              href={buildHref({ sort: "worst" })}
              label={t("sortWorst")}
            />
          </div>
        </div>
      )}

      {allReviews.length === 0 ? (
        <Card className="p-8 sm:p-12 border-dashed text-center">
          <Star className="size-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold">{t("empty")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("emptyBody")}</p>
        </Card>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          {t("noFilterResults")}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {sorted.map((r) => (
            <ReviewCard key={`${r.media_type}-${r.tmdb_id}`} review={r} />
          ))}
        </div>
      )}
    </main>
  );
}

function FilterPill({
  active,
  href,
  label,
  icon,
}: {
  active: boolean;
  href: string;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function SortPill({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors",
        active
          ? "bg-foreground/10 text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}

function ReviewCard({
  review,
}: {
  review: {
    tmdb_id: number;
    media_type: "movie" | "tv";
    rating: number;
    notes: string | null;
    title: string;
    year: number | null;
    poster_path: string | null;
    updated_at: string;
  };
}) {
  const detailHref =
    review.media_type === "tv"
      ? `/serie/${review.tmdb_id}`
      : `/movie/${review.tmdb_id}`;

  return (
    <Card className="p-3 sm:p-4 group hover:ring-2 hover:ring-primary/40 transition-all">
      <Link href={detailHref} prefetch={false} className="flex gap-3 sm:gap-4">
        <div className="relative shrink-0 w-16 sm:w-20 aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border">
          {review.poster_path ? (
            <Image
              src={`https://image.tmdb.org/t/p/w185${review.poster_path}`}
              alt={`Poster de ${review.title}`}
              fill
              sizes="(min-width: 640px) 80px, 64px"
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Film className="size-6 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Header: badge + título */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
                review.media_type === "tv"
                  ? "bg-purple-500/15 text-purple-400"
                  : "bg-blue-500/15 text-blue-400"
              )}
            >
              {review.media_type === "tv" ? (
                <Tv className="size-2.5" />
              ) : (
                <Film className="size-2.5" />
              )}
              {review.media_type === "tv" ? "Serie" : "Peli"}
            </span>
            {review.year && (
              <span className="text-xs text-muted-foreground">{review.year}</span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-bold tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
            {review.title}
          </h3>

          {/* Rating */}
          <div className="inline-flex items-baseline gap-1.5">
            <Star className="size-4 fill-amber-400 text-amber-400 self-center" />
            <span className="text-xl font-bold tabular-nums">
              {review.rating.toFixed(1)}
            </span>
            <span className="text-[10px] text-muted-foreground">/10</span>
          </div>

          {/* Notes snippet */}
          {review.notes && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {review.notes}
            </p>
          )}
        </div>
      </Link>
    </Card>
  );
}
