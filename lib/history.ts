import { createClient } from "@/lib/supabase/server";

// Shape unificado que comparte DB y localStorage.
export type HistoryItem = {
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  last_viewed_at: string; // ISO
};

// Server-side: lista las últimas N pelis del user logueado.
// Si no hay sesión o falla, devuelve [].
export async function getHistoryFromDb(limit = 50): Promise<HistoryItem[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("history")
      .select("tmdb_id, title, year, poster_path, last_viewed_at")
      .eq("user_id", user.id)
      .order("last_viewed_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[history:read] supabase error:", error.message);
      return [];
    }
    return (data ?? []) as HistoryItem[];
  } catch (err) {
    console.warn("[history:read] threw:", err);
    return [];
  }
}

// Server-side: hace upsert. Solo se llama si el user está logueado.
// El RLS garantiza que cada user solo escribe en sus propias rows.
export async function addVisitToDb(
  item: Omit<HistoryItem, "last_viewed_at">
): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("history").upsert(
      {
        user_id: user.id,
        tmdb_id: item.tmdb_id,
        title: item.title,
        year: item.year,
        poster_path: item.poster_path,
        last_viewed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,tmdb_id" }
    );

    if (error) {
      console.warn("[history:write] supabase error:", error.message);
    }
  } catch (err) {
    console.warn("[history:write] threw:", err);
  }
}
