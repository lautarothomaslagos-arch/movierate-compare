// "Ya las vi" en localStorage para users anónimos. Espejo de watchlist-local.

export type WatchedItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
  watched_at: string;
};

const KEY = "movierate:watched:v1";
const MAX_ITEMS = 200;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getLocalWatched(): WatchedItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items: WatchedItem[] = parsed
      .filter(
        (x: unknown): x is Partial<WatchedItem> & {
          tmdb_id: number;
          title: string;
          watched_at: string;
        } =>
          !!x &&
          typeof x === "object" &&
          typeof (x as { tmdb_id?: unknown }).tmdb_id === "number" &&
          typeof (x as { title?: unknown }).title === "string" &&
          typeof (x as { watched_at?: unknown }).watched_at === "string"
      )
      .map(
        (x): WatchedItem => ({
          tmdb_id: x.tmdb_id,
          media_type: x.media_type === "tv" ? "tv" : "movie",
          title: x.title,
          year: x.year ?? null,
          poster_path: x.poster_path ?? null,
          watched_at: x.watched_at,
        })
      );
    return items
      .sort(
        (a, b) =>
          new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime()
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function isInLocalWatched(
  tmdbId: number,
  mediaType: "movie" | "tv" = "movie"
): boolean {
  return getLocalWatched().some(
    (x) => x.tmdb_id === tmdbId && x.media_type === mediaType
  );
}

export function addToLocalWatched(
  item: Omit<WatchedItem, "watched_at">
): void {
  if (!isBrowser()) return;
  try {
    const current = getLocalWatched();
    const filtered = current.filter(
      (x) =>
        !(x.tmdb_id === item.tmdb_id && x.media_type === item.media_type)
    );
    const next: WatchedItem[] = [
      { ...item, watched_at: new Date().toISOString() },
      ...filtered,
    ].slice(0, MAX_ITEMS);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage lleno
  }
}

export function removeFromLocalWatched(
  tmdbId: number,
  mediaType: "movie" | "tv" = "movie"
): void {
  if (!isBrowser()) return;
  try {
    const next = getLocalWatched().filter(
      (x) => !(x.tmdb_id === tmdbId && x.media_type === mediaType)
    );
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // silenciamos
  }
}
