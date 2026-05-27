import { getWatchlistFromDb } from "@/lib/watchlist";
import { getTvDetails } from "@/lib/tmdb";

// Episodio próximo a salir de una serie que el user tiene en watchlist.
// Lo usamos en home (sección "Próximo en tu lista") y para el banner en
// /serie/[id].
export type UpcomingEpisode = {
  tmdb_id: number; // id de la serie
  series_title: string;
  series_poster_path: string | null;
  episode: {
    name: string | null;
    air_date: string; // ISO YYYY-MM-DD
    episode_number: number | null;
    season_number: number | null;
    still_path: string | null;
  };
  days_until: number; // entero, 0 = hoy, 1 = mañana, etc.
};

// Días entre hoy y la fecha (UTC, redondeo hacia arriba positivo).
// Retorna entero. Puede ser negativo si la fecha ya pasó.
function daysFromToday(isoDate: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(isoDate + "T00:00:00Z");
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// Devuelve los próximos episodios de las series que el user tiene en
// watchlist y que salen al aire en los próximos `daysAhead` días (default 14).
// Si el user no está logueado o no tiene series en watchlist, devuelve [].
export async function getUpcomingFromWatchlist(
  daysAhead = 14
): Promise<UpcomingEpisode[]> {
  try {
    const watchlist = await getWatchlistFromDb(200);
    const tvOnly = watchlist.filter((w) => w.media_type === "tv");
    if (tvOnly.length === 0) return [];

    // Fetch en paralelo. Si alguno falla, lo ignoramos (Promise.allSettled).
    const results = await Promise.allSettled(
      tvOnly.map((w) => getTvDetails(w.tmdb_id))
    );

    const upcoming: UpcomingEpisode[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== "fulfilled") continue;
      const tv = r.value;
      const next = tv.next_episode_to_air;
      if (!next?.air_date) continue;

      const days = daysFromToday(next.air_date);
      // Filtramos: solo en el futuro (>= 0) y dentro del rango
      if (days < 0 || days > daysAhead) continue;

      upcoming.push({
        tmdb_id: tv.id,
        series_title: tv.name,
        series_poster_path: tv.poster_path ?? tvOnly[i].poster_path ?? null,
        episode: {
          name: next.name ?? null,
          air_date: next.air_date,
          episode_number: next.episode_number ?? null,
          season_number: next.season_number ?? null,
          still_path: next.still_path ?? null,
        },
        days_until: days,
      });
    }

    // Orden ascendente por proximidad
    upcoming.sort((a, b) => a.days_until - b.days_until);
    return upcoming;
  } catch (err) {
    console.warn("[upcoming] failed:", err);
    return [];
  }
}

// Para el banner en /serie/[id]: dado un next_episode_to_air, devolver
// info procesada o null si está fuera del rango o no aplica.
export function processNextEpisode(
  next:
    | {
        name?: string | null;
        air_date?: string | null;
        episode_number?: number | null;
        season_number?: number | null;
      }
    | null
    | undefined,
  daysAhead = 7
): {
  name: string | null;
  air_date: string;
  episode_number: number | null;
  season_number: number | null;
  days_until: number;
} | null {
  if (!next?.air_date) return null;
  const days = daysFromToday(next.air_date);
  if (days < 0 || days > daysAhead) return null;
  return {
    name: next.name ?? null,
    air_date: next.air_date,
    episode_number: next.episode_number ?? null,
    season_number: next.season_number ?? null,
    days_until: days,
  };
}
