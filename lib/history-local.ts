// Mismo shape que lib/history.ts pero almacenado en localStorage.
// Se usa SOLO desde client components (no hay localStorage en el server).

export type HistoryItem = {
  tmdb_id: number;
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
    return parsed
      .filter(
        (x): x is HistoryItem =>
          x &&
          typeof x === "object" &&
          typeof x.tmdb_id === "number" &&
          typeof x.title === "string" &&
          typeof x.last_viewed_at === "string"
      )
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
  item: Omit<HistoryItem, "last_viewed_at">
): void {
  if (!isBrowser()) return;
  try {
    const current = getLocalHistory();
    // Filtramos el item si ya existe (lo vamos a reinsertar arriba)
    const filtered = current.filter((x) => x.tmdb_id !== item.tmdb_id);
    const next: HistoryItem[] = [
      { ...item, last_viewed_at: new Date().toISOString() },
      ...filtered,
    ].slice(0, MAX_ITEMS);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage lleno o desactivado → silenciamos
  }
}

export function removeLocalItem(tmdbId: number): void {
  if (!isBrowser()) return;
  try {
    const current = getLocalHistory();
    const next = current.filter((x) => x.tmdb_id !== tmdbId);
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
