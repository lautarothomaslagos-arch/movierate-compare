import { MovieGrid, type GridMovie } from "@/components/MovieGrid";
import { getRecommendations, getYear } from "@/lib/tmdb";

// Server Component async. Hace fetch a TMDB y renderiza grid.
// Si TMDB falla, devuelve mensaje neutral en vez de romper la página.
export async function RecommendationsSection({ tmdbId }: { tmdbId: number }) {
  let movies: GridMovie[] = [];
  try {
    const data = await getRecommendations(tmdbId);
    movies = data.results.slice(0, 12).map((m) => ({
      id: m.id,
      title: m.title,
      year: getYear(m.release_date),
      poster_path: m.poster_path ?? null,
    }));
  } catch (err) {
    console.error("[RecommendationsSection] TMDB failed:", err);
    // movies queda en []
  }

  return <MovieGrid movies={movies} />;
}
