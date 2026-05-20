import { createClient } from "@/lib/supabase/server";

// Shape unificado que comparte DB y localStorage.
export type HistoryItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
  last_viewed_at: string; // ISO
};

// Server-side: lista las últimas N visitas del user logueado (mezcla pelis + series).
// Si no hay sesión o falla, devuelve [].
export async function getHistoryFromDb(limit = 50): Promise<HistoryItem[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("history")
      .select("tmdb_id, media_type, title, year, poster_path, last_viewed_at")
      .eq("user_id", user.id)
      .order("last_viewed_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[history:read] supabase error:", error.message);
      return [];
    }
    // Coerción defensiva: si media_type viene null/undefined (rows viejos
    // antes de la migration) lo tratamos como 'movie'
    return ((data ?? []) as Array<HistoryItem & { media_type: string | null }>).map(
      (r) => ({
        ...r,
        media_type: r.media_type === "tv" ? "tv" : "movie",
      })
    );
  } catch (err) {
    console.warn("[history:read] threw:", err);
    return [];
  }
}

// Server-side: hace upsert. Solo se llama si el user está logueado.
// El RLS garantiza que cada user solo escribe en sus propias rows.
export async function addVisitToDb(
  item: Omit<HistoryItem, "last_viewed_at" | "media_type"> & {
    media_type?: "movie" | "tv";
  }
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const mediaType = item.media_type ?? "movie";

    const { error } = await supabase.from("history").upsert(
      {
        user_id: user.id,
        tmdb_id: item.tmdb_id,
        media_type: mediaType,
        title: item.title,
        year: item.year,
        poster_path: item.poster_path,
        last_viewed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,tmdb_id,media_type" }
    );

    if (error) {
      console.warn("[history:write] supabase error:", error.message);
    }
  } catch (err) {
    console.warn("[history:write] threw:", err);
  }
}
