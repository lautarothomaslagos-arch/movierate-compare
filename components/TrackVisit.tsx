"use client";

import { useEffect } from "react";

import { addLocalVisit } from "@/lib/history-local";

// Para usuarios NO logueados. Cuando montás la página /movie/[id] o /serie/[id],
// este componente persiste la visita en localStorage.
// El equivalente para logueados se hace server-side en page.tsx vía addVisitToDb.
export function TrackVisit({
  tmdb_id,
  media_type = "movie",
  title,
  year,
  poster_path,
}: {
  tmdb_id: number;
  media_type?: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
}) {
  useEffect(() => {
    addLocalVisit({ tmdb_id, media_type, title, year, poster_path });
  }, [tmdb_id, media_type, title, year, poster_path]);

  return null;
}
