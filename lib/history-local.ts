// Mismo shape que lib/history.ts pero almacenado en localStorage.
// Se usa SOLO desde client components (no hay localStorage en el server).

export type HistoryItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
  last_viewed_at: string;
};

const KEY = "movierate:history:v1";
const MAX_ITEMS = 50;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getLocalHistory(): HistoryItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items: HistoryItem[] = parsed
      .filter(
        (x: unknown): x is Partial<HistoryItem> & {
          tmdb_id: number;
          title: string;
          last_viewed_at: string;
        } =>
          !!x &&
          typeof x === "object" &&
          typeof (x as { tmdb_id?: unknown }).tmdb_id === "number" &&
          typeof (x as { title?: unknown }).title === "string" &&
          typeof (x as { last_viewed_at?: unknown }).last_viewed_at === "string"
      )
      .map(
        (x): HistoryItem => ({
          tmdb_id: x.tmdb_id,
          // Rows del storage viejo no tienen media_type → default movie
          media_type: x.media_type === "tv" ? "tv" : "movie",
          title: x.title,
          year: x.year ?? null,
          poster_path: x.poster_path ?? null,
          last_viewed_at: x.last_viewed_at,
        })
      );
    return items
      .sort(
        (a, b) =>
          new Date(b.last_viewed_at).getTime() -
          new Date(a.last_viewed_at).getTime()
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function addLocalVisit(
  item: Omit<HistoryItem, "last_viewed_at" | "media_type"> & {
    media_type?: "movie" | "tv";
  }
): void {
  if (!isBrowser()) return;
  try {
    const mediaType = item.media_type ?? "movie";
    const current = getLocalHistory();
    // Filtramos el item si ya existe (mismo tmdb_id Y mismo media_type)
    const filtered = current.filter(
      (x) => !(x.tmdb_id === item.tmdb_id && x.media_type === mediaType)
    );
    const next: HistoryItem[] = [
      {
        tmdb_id: item.tmdb_id,
        media_type: mediaType,
        title: item.title,
        year: item.year,
        poster_path: item.poster_path,
        last_viewed_at: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, MAX_ITEMS);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage lleno o desactivado → silenciamos
  }
}

export function removeLocalItem(
  tmdbId: number,
  mediaType: "movie" | "tv" = "movie"
): void {
  if (!isBrowser()) return;
  try {
    const current = getLocalHistory();
    const next = current.filter(
      (x) => !(x.tmdb_id === tmdbId && x.media_type === mediaType)
    );
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // silenciamos
  }
}

export function clearLocalHistory(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // silenciamos
  }
}
