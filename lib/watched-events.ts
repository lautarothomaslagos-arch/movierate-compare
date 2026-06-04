"use client";

// Bus de eventos para sincronizar el estado de "ya las vi" entre componentes
// de la misma página. Mismo patrón que watchlist-events.
//
// Por qué deferred via queueMicrotask: igual que watchlist, evitamos race
// con startTransition en React 19 (setState del caller termina antes de
// que los listeners se ejecuten).

type WatchedChangeDetail = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  watched: boolean;
};

const EVENT_NAME = "movierate:watched-change";

export function dispatchWatchedChange(detail: WatchedChangeDetail) {
  if (typeof window === "undefined") return;
  queueMicrotask(() => {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
    } catch (err) {
      console.warn("[watched-events] dispatch threw:", err);
    }
  });
}

export function subscribeToWatchedChange(
  handler: (detail: WatchedChangeDetail) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  function onEvent(e: Event) {
    try {
      const ce = e as CustomEvent<WatchedChangeDetail>;
      if (ce.detail) handler(ce.detail);
    } catch (err) {
      console.warn("[watched-events] handler threw:", err);
    }
  }
  window.addEventListener(EVENT_NAME, onEvent);
  return () => window.removeEventListener(EVENT_NAME, onEvent);
}
