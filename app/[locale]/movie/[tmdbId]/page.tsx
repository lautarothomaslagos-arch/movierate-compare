import { ArrowLeft, Calendar, Clock, Film } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  CollectionSection,
  CollectionSkeleton,
} from "@/components/CollectionSection";
import { FullCastModal } from "@/components/FullCastModal";
import { JsonLd } from "@/components/JsonLd";
import {
  ImageGallery,
  ImageGallerySkeleton,
} from "@/components/ImageGallery";
import { ProductionSection } from "@/components/ProductionSection";
import { ReleaseDatesSection } from "@/components/ReleaseDatesSection";
import { MovieGridSkeleton } from "@/components/MovieGrid";
import {
  RatingsSection,
  RatingsSkeleton,
} from "@/components/RatingsSection";
import { RecommendationsSection } from "@/components/RecommendationsSection";
import { ShareButton } from "@/components/ShareButton";
import { CompareButton } from "@/components/CompareButton";
import { TrackVisit } from "@/components/TrackVisit";
import { WatchlistButton } from "@/components/WatchlistButton";
import {
  TrailerSection,
  TrailerSkeleton,
} from "@/components/TrailerSection";
import { TriviaSection, TriviaSkeleton } from "@/components/TriviaSection";
import {
  WhereToWatch,
  WhereToWatchSkeleton,
} from "@/components/WhereToWatch";
import { Link } from "@/i18n/navigation";
import { genreBadgeClass } from "@/lib/genre-colors";
import { movieJsonLd, SITE_URL } from "@/lib/seo";
import { addVisitToDb } from "@/lib/history";
import { createClient } from "@/lib/supabase/server";
import { backdropUrl, getMovieDetails, getYear, posterUrl } from "@/lib/tmdb";
import { isInWatchlist } from "@/lib/watchlist";

type Props = {
  params: Promise<{ tmdbId: string; locale: string }>;
};

// Genera metadata dinámica por película — incluye Open Graph y Twitter cards
// para que al compartir el link en redes/whatsapp se vea poster + título.
export async function generateMetadata({ params }: Props) {
  const { tmdbId } = await params;
  const id = parseInt(tmdbId, 10);
  if (!Number.isFinite(id)) return { title: "MovieRate Compare" };

  try {
    const movie = await getMovieDetails(id);
    const year = getYear(movie.release_date);
    const fullTitle = `${movie.title}${year ? ` (${year})` : ""} — MovieRate Compare`;
    const description =
      movie.overview?.slice(0, 200) ??
      "Compará ratings de IMDb, Rotten Tomatoes, Metacritic, TMDB, Letterboxd y Filmaffinity en un solo lugar.";
    const ogImage = movie.poster_path
      ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
      : undefined;

    return {
      title: fullTitle,
      description,
      openGraph: {
        title: fullTitle,
        description,
        type: "video.movie",
        ...(ogImage && {
          images: [
            {
              url: ogImage,
              width: 780,
              height: 1170,
              alt: `Poster de ${movie.title}`,
            },
          ],
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

function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export default async function MoviePage({ params }: Props) {
  const { tmdbId, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const id = parseInt(tmdbId, 10);
  if (!Number.isFinite(id)) notFound();

  let movie;
  try {
    movie = await getMovieDetails(id);
  } catch {
    notFound();
  }

  const year = getYear(movie.release_date);
  const runtime = formatRuntime(movie.runtime);
  const poster = posterUrl(movie.poster_path, "w500");
  const backdrop = backdropUrl(movie.backdrop_path, "w1280");
  const directors =
    movie.credits?.crew?.filter((c) => c.job === "Director") ?? [];
  const topCast = movie.credits?.cast?.slice(0, 6) ?? [];

  // Tracking de visita. Si hay sesión, upsert en DB (await — penalidad
  // <100ms). Si no, el <TrackVisit/> en el render guarda en localStorage.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLogged = !!user;
  if (isLogged) {
    await addVisitToDb({
      tmdb_id: movie.id,
      title: movie.title,
      year,
      poster_path: movie.poster_path ?? null,
    });
  }

  // Chequear si está en watchlist (solo logueado; anónimo lo chequea en cliente)
  const initiallyInWatchlist = isLogged
    ? await isInWatchlist(movie.id, "movie")
    : false;

  // JSON-LD para SEO (rich snippets en Google)
  const jsonLd = movieJsonLd({
    title: movie.title,
    originalTitle: movie.original_title,
    url: `${SITE_URL}/movie/${movie.id}`,
    imageUrl: movie.poster_path
      ? `https://image.tmdb.org/t/p/w780${movie.poster_path}`
      : null,
    description: movie.overview ?? null,
    releaseDate: movie.release_date,
    runtime: movie.runtime,
    director: directors[0]?.name ?? null,
    cast: topCast.map((c) => ({ name: c.name })),
    genres: movie.genres,
    rating10: movie.vote_average,
    ratingCount: movie.vote_count,
  });

  return (
    <div className="flex flex-col flex-1">
      <JsonLd data={jsonLd} />
      {/* Tracking de visita para anónimos (logueados ya se guardó arriba). */}
      {!isLogged && (
        <TrackVisit
          tmdb_id={movie.id}
          title={movie.title}
          year={year}
          poster_path={movie.poster_path ?? null}
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

      <header className="px-4 sm:px-6 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          {t("common.back")}
        </Link>
      </header>

      <main className="px-4 sm:px-6 pb-16 max-w-5xl mx-auto w-full">
        <section className="flex flex-col md:flex-row gap-6 md:gap-8 mb-10">
          {/* Poster */}
          <div className="shrink-0 mx-auto md:mx-0">
            <div className="relative w-48 sm:w-56 md:w-64 aspect-[2/3] bg-muted rounded-lg overflow-hidden shadow-2xl ring-1 ring-border">
              {poster ? (
                <Image
                  src={poster}
                  alt={`Poster de ${movie.title}`}
                  fill
                  priority
                  sizes="(min-width: 768px) 256px, (min-width: 640px) 224px, 192px"
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Film className="size-12 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 text-center md:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {movie.title}
            </h1>
            {movie.original_title && movie.original_title !== movie.title && (
              <p className="text-sm text-muted-foreground italic mt-1">
                {movie.original_title}
              </p>
            )}

            <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
              {year && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {year}
                </span>
              )}
              {runtime && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {runtime}
                </span>
              )}
            </div>

            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-3">
                {movie.genres.map((g) => (
                  <span
                    key={g.id}
                    className={`inline-block px-2.5 py-0.5 text-xs rounded-full border ${genreBadgeClass(g.id)}`}
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {movie.overview && (
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-foreground/90">
                {movie.overview}
              </p>
            )}

            {directors.length > 0 && (
              <div className="mt-4 text-sm">
                <span className="text-muted-foreground">
                  {directors.length === 1
                    ? t("movie.directorOne")
                    : t("movie.directorMany")}
                </span>
                <span className="font-medium">
                  {directors.map((d) => d.name).join(", ")}
                </span>
              </div>
            )}

            {/* Botones de acción: watchlist + share */}
            <div className="mt-5 flex flex-wrap gap-2 justify-center md:justify-start">
              <WatchlistButton
                isLogged={isLogged}
                initiallyInList={initiallyInWatchlist}
                item={{
                  tmdb_id: movie.id,
                  media_type: "movie",
                  title: movie.title,
                  year,
                  poster_path: movie.poster_path ?? null,
                }}
              />
              <ShareButton
                title={movie.title}
                text={movie.overview?.slice(0, 100) ?? undefined}
              />
              <CompareButton currentId={movie.id} currentMediaType="movie" />
            </div>
          </div>
        </section>

        {/* Elenco */}
        {topCast.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-3">{t("movie.cast")}</h2>
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
                    <div className="relative aspect-[2/3] bg-muted rounded-md overflow-hidden mb-1.5 ring-1 ring-border transition-all group-hover:-translate-y-0.5 group-hover:ring-2 group-hover:ring-primary/60">
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
            {/* Botón "Ver todo el elenco" abre modal con todos los actores */}
            {movie.credits?.cast && movie.credits.cast.length > 6 && (
              <div className="mt-3 flex justify-center md:justify-start">
                <FullCastModal
                  cast={movie.credits.cast.map((a) => ({
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

        {/* Saga / Colección si la peli es parte de una */}
        {movie.belongs_to_collection && (
          <section className="mb-10">
            <Suspense fallback={<CollectionSkeleton />}>
              <CollectionSection
                collectionId={movie.belongs_to_collection.id}
                currentMovieId={movie.id}
              />
            </Suspense>
          </section>
        )}

        {/* Dato curioso — generado con Gemini Flash, cacheado en DB por id+locale.
            Si IA falla devuelve null y la sección desaparece. */}
        <section className="mb-10">
          <Suspense fallback={<TriviaSkeleton />}>
            <TriviaSection
              tmdbId={movie.id}
              mediaType="movie"
              input={{
                title: movie.title,
                originalTitle: movie.original_title,
                year,
                overview: movie.overview ?? null,
                director: directors[0]?.name ?? null,
                cast: topCast.map((c) => c.name),
                mediaType: "movie",
              }}
            />
          </Suspense>
        </section>

        {/* Tráiler — embed YouTube. Si TMDB no tiene videos devuelve null
            y la sección no aparece. */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">{t("movie.trailer")}</h2>
          <Suspense fallback={<TrailerSkeleton />}>
            <TrailerSection tmdbId={movie.id} />
          </Suspense>
        </section>

        {/* Galería de imágenes — backdrops alternativos */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">{t("movie.gallery")}</h2>
          <Suspense fallback={<ImageGallerySkeleton />}>
            <ImageGallery tmdbId={movie.id} />
          </Suspense>
        </section>

        {/* Dónde verla — streaming providers via TMDB (datos JustWatch). */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">{t("movie.whereToWatch")}</h2>
          <Suspense fallback={<WhereToWatchSkeleton />}>
            <WhereToWatch tmdbId={movie.id} />
          </Suspense>
        </section>

        {/* Ratings comparados — las 6 plataformas en paralelo con Promise.allSettled.
            Envuelto en Suspense para streamear: la peli renderiza ya,
            las cards aparecen cuando los scrapers/APIs terminan. */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">{t("movie.ratings")}</h2>
          <Suspense fallback={<RatingsSkeleton />}>
            <RatingsSection tmdbId={movie.id} />
          </Suspense>
        </section>

        {/* Producción: estudios, países, presupuesto, recaudación */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">
            {t("production.heading")}
          </h2>
          <ProductionSection
            studios={movie.production_companies}
            countries={movie.production_countries}
            languages={movie.spoken_languages}
            budget={movie.budget}
            revenue={movie.revenue}
          />
        </section>

        {/* Fechas de estreno por país */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">
            {t("releaseDates.heading")}
          </h2>
          <Suspense
            fallback={
              <div className="h-32 bg-muted/20 rounded-lg animate-pulse" />
            }
          >
            <ReleaseDatesSection movieId={movie.id} />
          </Suspense>
        </section>

        {/* Similares — top 12 de TMDB /recommendations.
            Suspense para que la peli se vea sin esperar este fetch. */}
        <section>
          <h2 className="text-lg font-semibold mb-3">{t("movie.similar")}</h2>
          <Suspense fallback={<MovieGridSkeleton />}>
            <RecommendationsSection tmdbId={movie.id} />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
