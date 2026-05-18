"use client";

import { useEffect } from "react";

import { addLocalVisit } from "@/lib/history-local";

// Para usuarios NO logueados. Cuando montás la página /movie/[id],
// este componente persiste la visita en localStorage.
// El equivalente para logueados se hace server-side en page.tsx vía addVisitToDb.
export function TrackVisit({
  tmdb_id,
  title,
  year,
  poster_path,
}: {
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
}) {
  useEffect(() => {
    addLocalVisit({ tmdb_id, title, year, poster_path });
  }, [tmdb_id, title, year, poster_path]);

  return null;
}
