"use client";

// Bus de eventos para sincronizar el estado de watchlist entre componentes
// que viven en la misma página (WatchlistButton arriba + MobileActionBar abajo).
//
// Por qué eventos en vez de Context: el WatchlistButton se monta como hijo
// de un Server Component (page.tsx), no podríamos envolverlo en un Provider
// sin convertir el árbol a client. Eventos son simples, sin deps externas.
//
// Flujo:
//   1. User clickea el botón A → toggle local → setInList(newValue)
//   2. A dispara dispatchWatchlistChange({ tmdb_id, media_type, inList })
//   3. El botón B (otra instancia, mismo item) escucha el evento y
//      sincroniza su estado interno.

type WatchlistChangeDetail = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  inList: boolean;
};

const EVENT_NAME = "movierate:watchlist-change";

export function dispatchWatchlistChange(detail: WatchlistChangeDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
}

export function subscribeToWatchlistChange(
  handler: (detail: WatchlistChangeDetail) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  function onEvent(e: Event) {
    const ce = e as CustomEvent<WatchlistChangeDetail>;
    if (ce.detail) handler(ce.detail);
  }
  window.addEventListener(EVENT_NAME, onEvent);
  return () => window.removeEventListener(EVENT_NAME, onEvent);
}
