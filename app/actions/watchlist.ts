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

export async function addToWatchlist(item: Item) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "no-session" as const };

  const { error } = await supabase.from("watchlist").upsert(
    {
      user_id: user.id,
      tmdb_id: item.tmdb_id,
      media_type: item.media_type,
      title: item.title,
      year: item.year,
      poster_path: item.poster_path,
      added_at: new Date().toISOString(),
    },
    { onConflict: "user_id,tmdb_id,media_type" }
  );

  if (error) {
    console.warn("[watchlist:add] error:", error.message);
    return { error: error.message };
  }

  revalidatePath("/watchlist");
  return { ok: true as const };
}

export async function removeFromWatchlist(
  tmdbId: number,
  mediaType: "movie" | "tv" = "movie"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "no-session" as const };

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType);

  if (error) {
    console.warn("[watchlist:remove] error:", error.message);
    return { error: error.message };
  }

  revalidatePath("/watchlist");
  return { ok: true as const };
}
