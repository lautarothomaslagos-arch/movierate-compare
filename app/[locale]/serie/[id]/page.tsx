import { ArrowLeft, PlayCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { FullCastModal } from "@/components/FullCastModal";
import { JsonLd } from "@/components/JsonLd";
import {
  ImageGallery,
  ImageGallerySkeleton,
} from "@/components/ImageGallery";
import { ProductionSection } from "@/components/ProductionSection";
import { MobileActionBar } from "@/components/MobileActionBar";
import { ReviewSection } from "@/components/ReviewSection";
import { SeasonsSection, SeasonsSkeleton } from "@/components/SeasonsSection";
import { TitleBillboard } from "@/components/title/TitleBillboard";
import {
  WeightedScoreHero,
  WeightedScoreHeroSkeleton,
} from "@/components/title/WeightedScoreHero";
import { UpcomingEpisodeBanner } from "@/components/UpcomingEpisodeBanner";
import { CompareButton } from "@/components/CompareButton";
import { ShareButton } from "@/components/ShareButton";
import { TrackVisit } from "@/components/TrackVisit";
import { WatchlistButton } from "@/components/WatchlistButton";
import {
  TrailerSection,
  TrailerSkeleton,
} from "@/components/TrailerSection";
import { TriviaSection, TriviaSkeleton } from "@/components/TriviaSection";
import {
  TvRatingsSection,
  TvRatingsSkeleton,
} from "@/components/TvRatingsSection";
import {
  TvRecommendationsSection,
  TvRecommendationsSkeleton,
} from "@/components/TvRecommendationsSection";
import {
  WhereToWatch,
  WhereToWatchSkeleton,
} from "@/components/WhereToWatch";
import { Link } from "@/i18n/navigation";
import { genreBadgeClass } from "@/lib/genre-colors";
import { buildAlternates, SITE_URL, tvSeriesJsonLd } from "@/lib/seo";
import { addVisitToDb } from "@/lib/history";
import { getReview } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/server";
import { backdropUrl, getTvDetails, getYear } from "@/lib/tmdb";
import { isInWatchlist } from "@/lib/watchlist";

type Props = {
  params: Promise<{ id: string; locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id, locale } = await params;
  const tvId = parseInt(id, 10);
  if (!Number.isFinite(tvId)) return { title: "MovieRate Compare" };
  try {
    const tv = await getTvDetails(tvId);
    const year = getYear(tv.first_air_date);
    const fullTitle = `${tv.name}${year ? ` (${year})` : ""} — MovieRate Compare`;
    const description =
      tv.overview?.slice(0, 200) ||
      "Compará ratings de series en IMDb, Rotten Tomatoes, Metacritic y TMDB en un solo lugar.";
    const ogImage = tv.poster_path
      ? `https://image.tmdb.org/t/p/w780${tv.poster_path}`
      : undefined;
    return {
      title: fullTitle,
      description,
      alternates: buildAlternates(locale, `/serie/${tvId}`),
      openGraph: {
        title: fullTitle,
        description,
        type: "video.tv_show",
        ...(ogImage && {
          images: [{ url: ogImage, width: 780, height: 1170, alt: tv.name }],
        }),
      },
      twitter: {
        card: ogImage ? "summary_large_image" : "summary",
        title: fullTitle,
        description,
        ...(ogImage && { images: [ogImage] }),
      },
    };
  } catch {
    return { title: "MovieRate Compare" };
  }
}

// Helper firma compatible con next-intl's translator (acepta strings/numbers/dates)
type TFn = (
  key: string,
  values?: Record<string, string | number | Date>
) => string;

function formatEpisodeRuntime(
  times: number[] | undefined,
  t: TFn
): string | null {
  if (!times || times.length === 0) return null;
  // TMDB devuelve un array — tomamos el promedio si hay varios
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  if (avg < 60) return t("tv.episodeRuntime", { value: avg });
  const h = Math.floor(avg / 60);
  const m = avg % 60;
  return m === 0
    ? t("tv.episodeRuntimeHours", { h })
    : t("tv.episodeRuntimeFull", { h, m });
}

// Set fijo de status que sabemos cómo traducir. Si TMDB devuelve un valor
// no contemplado, mostramos el crudo.
const KNOWN_STATUS = new Set([
  "Returning Series",
  "Ended",
  "Canceled",
  "In Production",
  "Planned",
  "Pilot",
]);
function translateStatus(status: string | null | undefined, t: TFn): string | null {
  if (!status) return null;
  if (KNOWN_STATUS.has(status)) return t(`tv.status.${status}`);
  return status;
}

export default async function SeriePage({ params }: Props) {
  const { id, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const tvId = parseInt(id, 10);
  if (!Number.isFinite(tvId)) notFound();

  let tv;
  try {
    tv = await getTvDetails(tvId);
  } catch {
    notFound();
  }

  const year = getYear(tv.first_air_date);
  const endYear = getYear(tv.last_air_date);
  const inProduction = tv.in_production === true;
  const runtimeStr = formatEpisodeRuntime(tv.episode_run_time, t);
  const statusStr = translateStatus(tv.status, t);
  const backdrop = backdropUrl(tv.backdrop_path, "w1280");
  const creators = tv.created_by ?? [];
  const topCast = tv.credits?.cast?.slice(0, 6) ?? [];

  // Año display: "2020 – 2023" o "2020 – presente" o "2020"
  let yearDisplay: string | null = null;
  if (year !== null) {
    if (endYear !== null && endYear !== year) {
      yearDisplay = inProduction
        ? t("tv.yearsToPresent", { startYear: year })
        : t("tv.yearsRange", { startYear: year, endYear });
    } else if (inProduction) {
      yearDisplay = t("tv.yearsToPresent", { startYear: year });
    } else {
      yearDisplay = String(year);
    }
  }

  // Tracking de visita
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLogged = !!user;
  if (isLogged) {
    await addVisitToDb({
      tmdb_id: tv.id,
      media_type: "tv",
      title: tv.name,
      year,
      poster_path: tv.poster_path ?? null,
    });
  }

  const initiallyInWatchlist = isLogged
    ? await isInWatchlist(tv.id, "tv")
    : false;

  // Review del user (solo logueado). null si no hay aún.
  const initialReview = isLogged ? await getReview(tv.id, "tv") : null;

  // JSON-LD para SEO
  const jsonLd = tvSeriesJsonLd({
    name: tv.name,
    originalName: tv.original_name,
    url: `${SITE_URL}/serie/${tv.id}`,
    imageUrl: tv.poster_path
      ? `https://image.tmdb.org/t/p/w780${tv.poster_path}`
      : null,
    description: tv.overview ?? null,
    firstAirDate: tv.first_air_date,
    numberOfSeasons: tv.number_of_seasons,
    numberOfEpisodes: tv.number_of_episodes,
    creators: creators.map((c) => ({ name: c.name })),
    cast: topCast.map((c) => ({ name: c.name })),
    genres: tv.genres,
    rating10: tv.vote_average,
    ratingCount: tv.vote_count,
  });

  return (
    <div className="flex flex-col flex-1">
      <JsonLd data={jsonLd} />
      {!isLogged && (
        <TrackVisit
          tmdb_id={tv.id}
          media_type="tv"
          title={tv.name}
          year={year}
          poster_path={tv.poster_path ?? null}
        />
      )}

      {/* Backdrop hero blureado de fondo */}
      {backdrop && (
        <div className="absolute inset-x-0 top-0 h-[40vh] sm:h-[55vh] -z-10 overflow-hidden">
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-25 blur-sm"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
        </div>
      )}

      <header className="px-4 sm:px-6 py-4 max-w-5xl mx-auto w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          {t("common.back")}
        </Link>
      </header>

      <main className="px-4 sm:px-6 pb-16 max-w-5xl mx-auto w-full">
        {/* Banner de próximo episodio (Fase F.4). Solo si next_episode_to_air
            cae en los próximos 7 días, sino devuelve null. */}
        <div className="mb-6">
          <UpcomingEpisodeBanner nextEpisode={tv.next_episode_to_air} />
        </div>

        {/* Billboard editorial sobre el fold (Fase G.1) */}
        <section className="mb-8 sm:mb-10">
          <TitleBillboard
            title={tv.name}
            originalTitle={tv.original_name ?? null}
            posterPath={tv.poster_path ?? null}
            eyebrow={[
              "Serie",
              tv.genres?.map((g) => g.name).join(" · "),
              yearDisplay,
              tv.number_of_seasons
                ? tv.number_of_seasons === 1
                  ? t("tv.seasonsOne", { count: tv.number_of_seasons })
                  : t("tv.seasonsOther", { count: tv.number_of_seasons })
                : undefined,
              runtimeStr ?? undefined,
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            <Suspense fallback={<WeightedScoreHeroSkeleton />}>
              <WeightedScoreHero tmdbId={tv.id} mediaType="tv" />
            </Suspense>
          </TitleBillboard>
        </section>

        {/* Detalle narrativo: status, géneros con color, sinopsis, creadores, CTAs */}
        <section className="mb-10 space-y-4">
          {(statusStr || tv.genres?.length) && (
            <div className="flex flex-wrap items-center gap-2">
              {statusStr && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <PlayCircle className="size-3" />
                  {statusStr}
                </span>
              )}
              {tv.genres?.map((g) => (
                <span
                  key={g.id}
                  className={`inline-block px-2.5 py-0.5 text-xs rounded-full border ${genreBadgeClass(g.id)}`}
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {tv.overview && (
            <p className="text-sm sm:text-base leading-relaxed text-foreground/90 max-w-prose">
              {tv.overview}
            </p>
          )}

          {creators.length > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">
                {creators.length === 1
                  ? t("tv.creatorOne")
                  : t("tv.creatorMany")}
              </span>
              <span className="font-medium">
                {creators.map((c) => c.name).join(", ")}
              </span>
            </div>
          )}

          <div id="actions" className="flex flex-wrap gap-2 pt-1 scroll-mt-20">
            <WatchlistButton
              isLogged={isLogged}
              initiallyInList={initiallyInWatchlist}
              item={{
                tmdb_id: tv.id,
                media_type: "tv",
                title: tv.name,
                year,
                poster_path: tv.poster_path ?? null,
              }}
            />
            <ShareButton
              title={tv.name}
              text={tv.overview?.slice(0, 100) ?? undefined}
            />
            <CompareButton currentId={tv.id} currentMediaType="tv" />
          </div>
        </section>

        {/* Elenco */}
        {topCast.length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight mb-3 sm:mb-4">{t("movie.cast")}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
              {topCast.map((actor) => {
                const profile = actor.profile_path
                  ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                  : null;
                return (
                  <Link
                    key={actor.id}
                    href={`/actor/${actor.id}`}
                    className="text-center group block"
                    prefetch={false}
                  >
                    <div className="poster-frame relative aspect-[2/3] bg-muted rounded-md overflow-hidden mb-1.5 ring-1 ring-border group-hover:ring-primary/60">
                      {profile ? (
                        <Image
                          src={profile}
                          alt={actor.name}
                          fill
                          sizes="(min-width: 768px) 120px, 25vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-2xl">
                          ?
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                      {actor.name}
                    </div>
                    {actor.character && (
                      <div className="text-xs text-muted-foreground truncate">
                        {actor.character}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
            {/* Botón ver todo el elenco */}
            {tv.credits?.cast && tv.credits.cast.length > 6 && (
              <div className="mt-3 flex justify-center md:justify-start">
                <FullCastModal
                  cast={tv.credits.cast.map((a) => ({
                    id: a.id,
                    name: a.name,
                    character: a.character,
                    profile_path: a.profile_path,
                  }))}
                />
              </div>
            )}
          </section>
        )}

        {/* Temporadas con mejor/peor episodio */}
        {tv.seasons && tv.seasons.filter((s) => s.season_number > 0).length > 0 && (
          <section className="mb-10">
            <h2 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight mb-3 sm:mb-4">
              {t("seasons.heading")}
            </h2>
            <Suspense fallback={<SeasonsSkeleton />}>
              <SeasonsSection tvId={tv.id} seasons={tv.seasons} />
            </Suspense>
          </section>
        )}

        {/* Tráiler */}
        <section className="mb-10">
          <h2 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight mb-3 sm:mb-4">{t("movie.trailer")}</h2>
          <Suspense fallback={<TrailerSkeleton />}>
            <TrailerSection tmdbId={tv.id} mediaType="tv" />
          </Suspense>
        </section>

        {/* Dato curioso — IA */}
        <section className="mb-10">
          <Suspense fallback={<TriviaSkeleton />}>
            <TriviaSection
              tmdbId={tv.id}
              mediaType="tv"
              input={{
                title: tv.name,
                originalTitle: tv.original_name,
                year,
                overview: tv.overview ?? null,
                director: creators[0]?.name ?? null,
                cast: topCast.map((c) => c.name),
                mediaType: "tv",
              }}
            />
          </Suspense>
        </section>

        {/* Galería */}
        <section className="mb-10">
          <h2 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight mb-3 sm:mb-4">{t("movie.gallery")}</h2>
          <Suspense fallback={<ImageGallerySkeleton />}>
            <ImageGallery tmdbId={tv.id} mediaType="tv" />
          </Suspense>
        </section>

        {/* Dónde verla */}
        <section className="mb-10">
          <h2 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight mb-3 sm:mb-4">{t("movie.whereToWatch")}</h2>
          <Suspense fallback={<WhereToWatchSkeleton />}>
            <WhereToWatch tmdbId={tv.id} mediaType="tv" />
          </Suspense>
        </section>

        {/* Ratings — solo IMDb, RT, Metacritic, TMDB (no Letterboxd/Filmaffinity) */}
        <section className="mb-10">
          <h2 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight mb-3 sm:mb-4">{t("movie.ratings")}</h2>
          <Suspense fallback={<TvRatingsSkeleton />}>
            <TvRatingsSection tvId={tv.id} />
          </Suspense>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("tv.letterboxdNoTv")}
          </p>
        </section>

        {/* Tu review personal (Fase F.3). RLS asegura privacidad. */}
        <section id="review-section" className="mb-10 scroll-mt-20">
          <h2 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight mb-3 sm:mb-4">{t("reviews.heading")}</h2>
          <ReviewSection
            tmdb_id={tv.id}
            media_type="tv"
            title={tv.name}
            year={getYear(tv.first_air_date)}
            poster_path={tv.poster_path ?? null}
            isLogged={isLogged}
            initialReview={
              initialReview
                ? {
                    rating: initialReview.rating,
                    notes: initialReview.notes,
                    updated_at: initialReview.updated_at,
                  }
                : null
            }
          />
        </section>

        {/* Producción */}
        <section className="mb-10">
          <h2 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight mb-3 sm:mb-4">
            {t("production.heading")}
          </h2>
          <ProductionSection
            studios={tv.production_companies}
            countries={tv.production_countries}
            languages={tv.spoken_languages}
            networks={tv.networks}
          />
        </section>

        {/* Similares */}
        <section className="pb-28 sm:pb-0">
          <h2 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight mb-3 sm:mb-4">{t("movie.similar")}</h2>
          <Suspense fallback={<TvRecommendationsSkeleton />}>
            <TvRecommendationsSection tvId={tv.id} />
          </Suspense>
        </section>
      </main>

      {/* Barra inferior fija en mobile con atajos a las acciones. */}
      <MobileActionBar
        isLogged={isLogged}
        item={{
          tmdb_id: tv.id,
          media_type: "tv",
          title: tv.name,
          year,
          poster_path: tv.poster_path ?? null,
        }}
        initiallyInList={initiallyInWatchlist}
        shareTitle={tv.name}
        shareText={tv.overview?.slice(0, 100) ?? undefined}
      />
    </div>
  );
}
