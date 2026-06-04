import { createClient } from "@/lib/supabase/server";

// Wrappers para la tabla `watched` ("ya las vi"). Espejo de lib/watchlist.ts.
// Conceptualmente:
//   - watchlist = "quiero ver"
//   - watched = "ya vi"
//   - user_reviews = "vi + le puse nota" (subset de watched)
//
// Cuando alguien marca como vista desde la UI, la server action mueve el
// item de watchlist → watched automáticamente (UX natural).

export type WatchedItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
  watched_at: string;
};

export async function getWatchedFromDb(
  limit = 100
): Promise<WatchedItem[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("watched")
      .select("tmdb_id, media_type, title, year, poster_path, watched_at")
      .eq("user_id", user.id)
      .order("watched_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[watched:read] error:", error.message);
      return [];
    }
    return ((data ?? []) as Array<WatchedItem & { media_type: string }>).map(
      (r) => ({
        ...r,
        media_type: r.media_type === "tv" ? "tv" : "movie",
      })
    );
  } catch (err) {
    console.warn("[watched:read] threw:", err);
    return [];
  }
}

// Chequea si un item está en "ya las vi". Devuelve false si no hay sesión.
export async function isWatched(
  tmdbId: number,
  mediaType: "movie" | "tv" = "movie"
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from("watched")
      .select("tmdb_id")
      .eq("user_id", user.id)
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .maybeSingle();

    if (error) return false;
    return data !== null;
  } catch {
    return false;
  }
}
