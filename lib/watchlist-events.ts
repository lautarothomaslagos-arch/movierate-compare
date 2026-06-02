"use client";

// Bus de eventos para sincronizar el estado de watchlist entre componentes
// que viven en la misma página (WatchlistButton arriba + MobileActionBar abajo).
//
// Por qué eventos en vez de Context: el WatchlistButton se monta como hijo
// de un Server Component (page.tsx), no podríamos envolverlo en un Provider
// sin convertir el árbol a client. Eventos son simples, sin deps externas.
//
// IMPORTANTE: el dispatch se difiere con queueMicrotask. Razón:
//   1. El caller hace setInList(value) → schedule re-render
//   2. Si dispatchEvent corre SINCRÓNICAMENTE acá, los listeners disparan
//      setInList en otras instancias ANTES de que React procese el primer
//      schedule, generando un estado inconsistente entre tree y store.
//   3. En React 19 + startTransition esto rompe la transición y dispara
//      el error boundary (la pantalla "Se cortó la película").
//   4. queueMicrotask defiere a después del tick actual: React completa
//      su batch, después corren los listeners, todo en orden.
//
// Además, envolvemos cada handler en try/catch para que un fallo de un
// listener no rompa el dispatch entero (ni el componente que lo disparó).

type WatchlistChangeDetail = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  inList: boolean;
};

const EVENT_NAME = "movierate:watchlist-change";

export function dispatchWatchlistChange(detail: WatchlistChangeDetail) {
  if (typeof window === "undefined") return;
  // Deferred: el caller termina su setState antes de que los listeners
  // reciban el evento. Evita race con startTransition.
  queueMicrotask(() => {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
    } catch (err) {
      console.warn("[watchlist-events] dispatch threw:", err);
    }
  });
}

export function subscribeToWatchlistChange(
  handler: (detail: WatchlistChangeDetail) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  function onEvent(e: Event) {
    // try/catch defensivo: si un handler tira, otros listeners + el
    // dispatch siguen funcionando.
    try {
      const ce = e as CustomEvent<WatchlistChangeDetail>;
      if (ce.detail) handler(ce.detail);
    } catch (err) {
      console.warn("[watchlist-events] handler threw:", err);
    }
  }
  window.addEventListener(EVENT_NAME, onEvent);
  return () => window.removeEventListener(EVENT_NAME, onEvent);
}
