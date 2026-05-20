import {
  ArrowLeft,
  Calendar,
  Clock,
  Film,
  Layers,
  PlayCircle,
} from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { TrackVisit } from "@/components/TrackVisit";
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
import { addVisitToDb } from "@/lib/history";
import { createClient } from "@/lib/supabase/server";
import { backdropUrl, getTvDetails, getYear, posterUrl } from "@/lib/tmdb";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
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

function formatEpisodeRuntime(times: number[] | undefined): string | null {
  if (!times || times.length === 0) return null;
  // TMDB devuelve un array — tomamos el promedio si hay varios
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  if (avg < 60) return `${avg} min/ep`;
  const h = Math.floor(avg / 60);
  const m = avg % 60;
  return m === 0 ? `${h}h/ep` : `${h}h ${m}min/ep`;
}

function translateStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  const map: Record<string, string> = {
    "Returning Series": "En emisión",
    Ended: "Terminada",
    Canceled: "Cancelada",
    "In Production": "En producción",
    Planned: "Planeada",
    Pilot: "Piloto",
  };
  return map[status] ?? status;
}

export default async function SeriePage({ params }: Props) {
  const { id } = await params;
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
  const runtimeStr = formatEpisodeRuntime(tv.episode_run_time);
  const statusStr = translateStatus(tv.status);
  const poster = posterUrl(tv.poster_path, "w500");
  const backdrop = backdropUrl(tv.backdrop_path, "w1280");
  const creators = tv.created_by ?? [];
  const topCast = tv.credits?.cast?.slice(0, 6) ?? [];

  // Año display: "2020 – 2023" o "2020 – presente" o "2020"
  let yearDisplay: string | null = null;
  if (year !== null) {
    if (endYear !== null && endYear !== year) {
      yearDisplay = inProduction ? `${year} – presente` : `${year} – ${endYear}`;
    } else if (inProduction) {
      yearDisplay = `${year} – presente`;
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

  return (
    <div className="flex flex-col flex-1">
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
          Volver
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
                  alt={`Poster de ${tv.name}`}
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
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-purple-500/15 text-purple-400">
                Serie
              </span>
              {statusStr && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <PlayCircle className="size-3" />
                  {statusStr}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {tv.name}
            </h1>
            {tv.original_name && tv.original_name !== tv.name && (
              <p className="text-sm text-muted-foreground italic mt-1">
                {tv.original_name}
              </p>
            )}

            <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
              {yearDisplay && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {yearDisplay}
                </span>
              )}
              {tv.number_of_seasons !== null &&
                tv.number_of_seasons !== undefined && (
                  <span className="inline-flex items-center gap-1">
                    <Layers className="size-3.5" />
                    {tv.number_of_seasons}{" "}
                    {tv.number_of_seasons === 1 ? "temporada" : "temporadas"}
                    {tv.number_of_episodes
                      ? ` · ${tv.number_of_episodes} eps`
                      : ""}
                  </span>
                )}
              {runtimeStr && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {runtimeStr}
                </span>
              )}
            </div>

            {tv.genres && tv.genres.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-3">
                {tv.genres.map((g) => (
                  <span
                    key={g.id}
                    className="inline-block px-2.5 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {tv.overview && (
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-foreground/90">
                {tv.overview}
              </p>
            )}

            {creators.length > 0 && (
              <div className="mt-4 text-sm">
                <span className="text-muted-foreground">
                  {creators.length === 1 ? "Creada por: " : "Creadores: "}
                </span>
                <span className="font-medium">
                  {creators.map((c) => c.name).join(", ")}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Elenco */}
        {topCast.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Elenco principal</h2>
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
          </section>
        )}

        {/* Dónde verla */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Dónde verla</h2>
          <Suspense fallback={<WhereToWatchSkeleton />}>
            <WhereToWatch tmdbId={tv.id} mediaType="tv" />
          </Suspense>
        </section>

        {/* Ratings — solo IMDb, RT, Metacritic, TMDB (no Letterboxd/Filmaffinity) */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Ratings comparados</h2>
          <Suspense fallback={<TvRatingsSkeleton />}>
            <TvRatingsSection tvId={tv.id} />
          </Suspense>
          <p className="mt-2 text-xs text-muted-foreground">
            Letterboxd no indexa series.
          </p>
        </section>

        {/* Similares */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Similares</h2>
          <Suspense fallback={<TvRecommendationsSkeleton />}>
            <TvRecommendationsSection tvId={tv.id} />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
