import { ArrowLeft, Calendar, Film, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getPersonDetails,
  getPersonMovieCredits,
  getPersonTvCredits,
  getYear,
  posterUrl,
  profileUrl,
} from "@/lib/tmdb";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const personId = parseInt(id, 10);
  if (!Number.isFinite(personId)) return { title: "MovieRate Compare" };
  try {
    const person = await getPersonDetails(personId);
    const description = person.biography?.slice(0, 200) || undefined;
    const ogImage = profileUrl(person.profile_path, "h632") ?? undefined;
    return {
      title: `${person.name} — MovieRate Compare`,
      description,
      openGraph: {
        title: person.name,
        description,
        type: "profile",
        ...(ogImage && {
          images: [{ url: ogImage, alt: person.name }],
        }),
      },
    };
  } catch {
    return { title: "MovieRate Compare" };
  }
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function calcAge(
  birthday: string | null | undefined,
  deathday: string | null | undefined
): number | null {
  if (!birthday) return null;
  try {
    const start = new Date(birthday).getTime();
    const end = deathday ? new Date(deathday).getTime() : Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    const years = (end - start) / (365.25 * 24 * 60 * 60 * 1000);
    return Math.floor(years);
  } catch {
    return null;
  }
}

export default async function ActorPage({ params }: Props) {
  const { id } = await params;
  const personId = parseInt(id, 10);
  if (!Number.isFinite(personId)) notFound();

  let person;
  let movieCredits;
  let tvCredits;
  try {
    // Fetch en paralelo del person + créditos de pelis + créditos de tv.
    // Si los créditos de TV fallan no rompe (algunas personas no tienen).
    const [p, mc, tc] = await Promise.all([
      getPersonDetails(personId),
      getPersonMovieCredits(personId),
      getPersonTvCredits(personId).catch(() => ({ id: personId, cast: [] })),
    ]);
    person = p;
    movieCredits = mc;
    tvCredits = tc;
  } catch {
    notFound();
  }

  const profile = profileUrl(person.profile_path, "h632");
  const birthFormatted = formatDate(person.birthday);
  const deathFormatted = formatDate(person.deathday);
  const age = calcAge(person.birthday, person.deathday);

  // Filmografía unificada (pelis + series), ordenada por popularidad desc.
  type Credit = {
    id: number;
    media_type: "movie" | "tv";
    title: string;
    year: number | null;
    poster_path: string | null;
    character: string | null | undefined;
    popularity: number;
  };

  const movieFilmography: Credit[] = (movieCredits.cast ?? []).map((c) => ({
    id: c.id,
    media_type: "movie",
    title: c.title,
    year: getYear(c.release_date),
    poster_path: c.poster_path ?? null,
    character: c.character,
    popularity: c.popularity ?? 0,
  }));

  const tvFilmography: Credit[] = (tvCredits.cast ?? []).map((c) => ({
    id: c.id,
    media_type: "tv",
    title: c.name,
    year: getYear(c.first_air_date),
    poster_path: c.poster_path ?? null,
    character: c.character,
    popularity: c.popularity ?? 0,
  }));

  // Dedupe por (id, media_type) — TMDB a veces tiene duplicados
  const seen = new Set<string>();
  const filmography: Credit[] = [...movieFilmography, ...tvFilmography]
    .filter((c) => {
      const key = `${c.media_type}-${c.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 24); // top 24

  return (
    <div className="flex flex-col flex-1">
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
        {/* Header con foto + info */}
        <section className="flex flex-col md:flex-row gap-6 md:gap-8 mb-10">
          <div className="shrink-0 mx-auto md:mx-0">
            <div className="relative w-40 sm:w-48 md:w-56 aspect-[2/3] bg-muted rounded-lg overflow-hidden shadow-xl ring-1 ring-border">
              {profile ? (
                <Image
                  src={profile}
                  alt={`Foto de ${person.name}`}
                  fill
                  priority
                  sizes="(min-width: 768px) 224px, (min-width: 640px) 192px, 160px"
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-3xl">
                  ?
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 text-center md:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {person.name}
            </h1>
            {person.known_for_department && (
              <p className="text-sm text-muted-foreground mt-1">
                {person.known_for_department}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
              {birthFormatted && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {birthFormatted}
                  {age !== null && (
                    <span className="ml-1">
                      ({age} {deathFormatted ? "años, falleció" : "años"})
                    </span>
                  )}
                </span>
              )}
              {deathFormatted && (
                <span className="inline-flex items-center gap-1">
                  <span className="opacity-60">†</span>
                  {deathFormatted}
                </span>
              )}
              {person.place_of_birth && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {person.place_of_birth}
                </span>
              )}
            </div>

            {person.biography ? (
              <Biography text={person.biography} />
            ) : (
              <p className="mt-4 text-sm text-muted-foreground italic">
                Sin biografía disponible para esta persona.
              </p>
            )}
          </div>
        </section>

        {/* Filmografía */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Filmografía{" "}
            {filmography.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({filmography.length})
              </span>
            )}
          </h2>
          {filmography.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground text-center">
              No tenemos filmografía registrada para esta persona.
            </Card>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {filmography.map((item) => {
                const poster = posterUrl(item.poster_path, "w342");
                const href =
                  item.media_type === "tv"
                    ? `/serie/${item.id}`
                    : `/movie/${item.id}`;
                return (
                  <Link
                    key={`${item.media_type}-${item.id}`}
                    href={href}
                    className="group block"
                    prefetch={false}
                  >
                    <div className="relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border transition-all group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-primary/60">
                      {poster ? (
                        <Image
                          src={poster}
                          alt={`Poster de ${item.title}`}
                          fill
                          sizes="(min-width: 768px) 160px, (min-width: 640px) 144px, 30vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Film className="size-8 text-muted-foreground" />
                        </div>
                      )}
                      <span
                        className={cn(
                          "absolute top-1 left-1 inline-block px-1 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide shadow",
                          item.media_type === "tv"
                            ? "bg-purple-500/90 text-white"
                            : "bg-blue-500/90 text-white"
                        )}
                      >
                        {item.media_type === "tv" ? "Serie" : "Peli"}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs font-medium truncate">
                      {item.title}
                    </div>
                    {(item.year !== null || item.character) && (
                      <div className="text-xs text-muted-foreground truncate">
                        {item.year !== null ? item.year : ""}
                        {item.year !== null && item.character ? " · " : ""}
                        {item.character}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// Biography con "Ver más" cuando es largo. Lo hacemos en server con un detalle
// CSS-only (sin estado) usando <details> nativo.
function Biography({ text }: { text: string }) {
  const TRIM_AT = 400;
  if (text.length <= TRIM_AT) {
    return (
      <p className="mt-4 text-sm sm:text-base leading-relaxed text-foreground/90 whitespace-pre-line">
        {text}
      </p>
    );
  }
  const preview = text.slice(0, TRIM_AT).trimEnd();
  const rest = text.slice(TRIM_AT);
  return (
    <details className="mt-4 group">
      <summary className="list-none cursor-pointer">
        <p className="text-sm sm:text-base leading-relaxed text-foreground/90 whitespace-pre-line inline">
          {preview}
          <span className="group-open:hidden">…</span>
          <span className="hidden group-open:inline whitespace-pre-line">
            {rest}
          </span>
        </p>
        <span className="block mt-2 text-xs font-medium text-primary hover:underline">
          <span className="group-open:hidden">Ver más</span>
          <span className="hidden group-open:inline">Ver menos</span>
        </span>
      </summary>
    </details>
  );
}
