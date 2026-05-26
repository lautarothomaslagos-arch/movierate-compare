// Generadores de JSON-LD Schema.org para mejorar la indexación.
// Spec: https://schema.org/Movie y https://schema.org/TVSeries
// Google los usa para rich snippets (estrellas en resultados de búsqueda).

type MovieJsonLdInput = {
  title: string;
  originalTitle?: string | null;
  url: string;
  imageUrl?: string | null;
  description?: string | null;
  releaseDate?: string | null;
  runtime?: number | null;
  director?: string | null;
  cast?: Array<{ name: string }>;
  genres?: Array<{ name: string }>;
  rating10?: number | null;
  ratingCount?: number | null;
};

export function movieJsonLd(input: MovieJsonLdInput): Record<string, unknown> {
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: input.title,
    url: input.url,
  };
  if (input.originalTitle && input.originalTitle !== input.title) {
    base.alternateName = input.originalTitle;
  }
  if (input.imageUrl) base.image = input.imageUrl;
  if (input.description) base.description = input.description;
  if (input.releaseDate) base.datePublished = input.releaseDate;
  if (input.runtime && input.runtime > 0) {
    base.duration = `PT${input.runtime}M`;
  }
  if (input.director) {
    base.director = { "@type": "Person", name: input.director };
  }
  if (input.cast && input.cast.length > 0) {
    base.actor = input.cast.slice(0, 10).map((c) => ({
      "@type": "Person",
      name: c.name,
    }));
  }
  if (input.genres && input.genres.length > 0) {
    base.genre = input.genres.map((g) => g.name);
  }
  if (
    input.rating10 !== null &&
    input.rating10 !== undefined &&
    input.ratingCount !== null &&
    input.ratingCount !== undefined &&
    input.ratingCount > 0
  ) {
    base.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.rating10.toFixed(1),
      bestRating: "10",
      worstRating: "0",
      ratingCount: input.ratingCount,
    };
  }
  return base;
}

type TvJsonLdInput = {
  name: string;
  originalName?: string | null;
  url: string;
  imageUrl?: string | null;
  description?: string | null;
  firstAirDate?: string | null;
  numberOfSeasons?: number | null;
  numberOfEpisodes?: number | null;
  creators?: Array<{ name: string }>;
  cast?: Array<{ name: string }>;
  genres?: Array<{ name: string }>;
  rating10?: number | null;
  ratingCount?: number | null;
};

export function tvSeriesJsonLd(input: TvJsonLdInput): Record<string, unknown> {
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: input.name,
    url: input.url,
  };
  if (input.originalName && input.originalName !== input.name) {
    base.alternateName = input.originalName;
  }
  if (input.imageUrl) base.image = input.imageUrl;
  if (input.description) base.description = input.description;
  if (input.firstAirDate) base.startDate = input.firstAirDate;
  if (input.numberOfSeasons) base.numberOfSeasons = input.numberOfSeasons;
  if (input.numberOfEpisodes) base.numberOfEpisodes = input.numberOfEpisodes;
  if (input.creators && input.creators.length > 0) {
    base.creator = input.creators.map((c) => ({
      "@type": "Person",
      name: c.name,
    }));
  }
  if (input.cast && input.cast.length > 0) {
    base.actor = input.cast.slice(0, 10).map((c) => ({
      "@type": "Person",
      name: c.name,
    }));
  }
  if (input.genres && input.genres.length > 0) {
    base.genre = input.genres.map((g) => g.name);
  }
  if (
    input.rating10 !== null &&
    input.rating10 !== undefined &&
    input.ratingCount !== null &&
    input.ratingCount !== undefined &&
    input.ratingCount > 0
  ) {
    base.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.rating10.toFixed(1),
      bestRating: "10",
      worstRating: "0",
      ratingCount: input.ratingCount,
    };
  }
  return base;
}

// Domain base — Vercel deploy. Si en algún momento cambias dominio,
// actualizá esto.
export const SITE_URL = "https://movierate-compare.vercel.app";
