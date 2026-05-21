// Watchlist en localStorage para users anónimos.

export type WatchlistItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
  added_at: string;
};

const KEY = "movierate:watchlist:v1";
const MAX_ITEMS = 200;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getLocalWatchlist(): WatchlistItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items: WatchlistItem[] = parsed
      .filter(
        (x: unknown): x is Partial<WatchlistItem> & {
          tmdb_id: number;
          title: string;
          added_at: string;
        } =>
          !!x &&
          typeof x === "object" &&
          typeof (x as { tmdb_id?: unknown }).tmdb_id === "number" &&
          typeof (x as { title?: unknown }).title === "string" &&
          typeof (x as { added_at?: unknown }).added_at === "string"
      )
      .map(
        (x): WatchlistItem => ({
          tmdb_id: x.tmdb_id,
          media_type: x.media_type === "tv" ? "tv" : "movie",
          title: x.title,
          year: x.year ?? null,
          poster_path: x.poster_path ?? null,
          added_at: x.added_at,
        })
      );
    return items
      .sort(
        (a, b) =>
          new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function isInLocalWatchlist(
  tmdbId: number,
  mediaType: "movie" | "tv" = "movie"
): boolean {
  return getLocalWatchlist().some(
    (x) => x.tmdb_id === tmdbId && x.media_type === mediaType
  );
}

export function addToLocalWatchlist(
  item: Omit<WatchlistItem, "added_at">
): void {
  if (!isBrowser()) return;
  try {
    const current = getLocalWatchlist();
    const filtered = current.filter(
      (x) =>
        !(x.tmdb_id === item.tmdb_id && x.media_type === item.media_type)
    );
    const next: WatchlistItem[] = [
      { ...item, added_at: new Date().toISOString() },
      ...filtered,
    ].slice(0, MAX_ITEMS);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage full
  }
}

export function removeFromLocalWatchlist(
  tmdbId: number,
  mediaType: "movie" | "tv" = "movie"
): void {
  if (!isBrowser()) return;
  try {
    const next = getLocalWatchlist().filter(
      (x) => !(x.tmdb_id === tmdbId && x.media_type === mediaType)
    );
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // silenciamos
  }
}
