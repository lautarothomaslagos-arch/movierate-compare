import { createClient } from "@/lib/supabase/server";

export type WatchlistItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
  added_at: string;
};

export async function getWatchlistFromDb(
  limit = 100
): Promise<WatchlistItem[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("watchlist")
      .select("tmdb_id, media_type, title, year, poster_path, added_at")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[watchlist:read] error:", error.message);
      return [];
    }
    return ((data ?? []) as Array<WatchlistItem & { media_type: string }>).map(
      (r) => ({
        ...r,
        media_type: r.media_type === "tv" ? "tv" : "movie",
      })
    );
  } catch (err) {
    console.warn("[watchlist:read] threw:", err);
    return [];
  }
}

// Chequea si un item está en la watchlist del user logueado.
// Devuelve false si no hay sesión.
export async function isInWatchlist(
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
      .from("watchlist")
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
