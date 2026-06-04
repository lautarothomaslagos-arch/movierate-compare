"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type Item = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
};

// Marca como "ya la vi". Si estaba en watchlist, la SACA automáticamente
// (UX natural: el item migra de "quiero ver" → "vi").
export async function addToWatched(item: Item) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "no-session" as const };

  // 1. Insert/upsert en watched
  const { error: insertError } = await supabase.from("watched").upsert(
    {
      user_id: user.id,
      tmdb_id: item.tmdb_id,
      media_type: item.media_type,
      title: item.title,
      year: item.year,
      poster_path: item.poster_path,
      watched_at: new Date().toISOString(),
    },
    { onConflict: "user_id,tmdb_id,media_type" }
  );

  if (insertError) {
    console.warn("[watched:add] error:", insertError.message);
    return { error: insertError.message };
  }

  // 2. Si estaba en watchlist, sacarla
  const { error: deleteError } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_id", item.tmdb_id)
    .eq("media_type", item.media_type);

  if (deleteError) {
    // No es crítico — el item ya está marcado como visto. Solo logueamos.
    console.warn(
      "[watched:add] watchlist cleanup error:",
      deleteError.message
    );
  }

  revalidatePath("/vistas");
  revalidatePath("/watchlist");
  return { ok: true as const };
}

export async function removeFromWatched(
  tmdbId: number,
  mediaType: "movie" | "tv" = "movie"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "no-session" as const };

  const { error } = await supabase
    .from("watched")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType);

  if (error) {
    console.warn("[watched:remove] error:", error.message);
    return { error: error.message };
  }

  revalidatePath("/vistas");
  return { ok: true as const };
}
