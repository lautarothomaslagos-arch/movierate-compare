import { createClient } from "@/lib/supabase/server";

// Review personal del usuario sobre una peli o serie.
// Schema espejado de la tabla public.user_reviews (migration 005).
// title/year/poster_path se snapshotean al momento del guardado para no
// tener que pegarle a TMDB al listar /mis-reviews.
export type UserReview = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  rating: number; // 0.0 - 10.0 (paso 0.5 en UI)
  notes: string | null;
  title: string;
  year: number | null;
  poster_path: string | null;
  created_at: string;
  updated_at: string;
};

// Devuelve la review del user actual para un item, o null si no existe / no
// hay sesión / falló RLS.
export async function getReview(
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<UserReview | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("user_reviews")
      .select("tmdb_id, media_type, rating, notes, title, year, poster_path, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .maybeSingle();

    if (error) {
      console.warn("[reviews:read] error:", error.message);
      return null;
    }
    if (!data) return null;
    return {
      ...data,
      media_type: data.media_type === "tv" ? "tv" : "movie",
      rating: Number(data.rating),
    };
  } catch (err) {
    console.warn("[reviews:read] threw:", err);
    return null;
  }
}

// Upsert: crea o actualiza la review. Requiere sesión.
// Devuelve la review guardada o null si falló.
export async function upsertReview(input: {
  tmdb_id: number;
  media_type: "movie" | "tv";
  rating: number;
  notes: string | null;
  title: string;
  year: number | null;
  poster_path: string | null;
}): Promise<UserReview | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Clamp del rating al rango permitido por el CHECK constraint
    const safeRating = Math.max(0, Math.min(10, Number(input.rating)));
    const safeNotes = input.notes?.trim() || null;

    const { data, error } = await supabase
      .from("user_reviews")
      .upsert(
        {
          user_id: user.id,
          tmdb_id: input.tmdb_id,
          media_type: input.media_type,
          rating: safeRating,
          notes: safeNotes,
          title: input.title,
          year: input.year,
          poster_path: input.poster_path,
        },
        { onConflict: "user_id,tmdb_id,media_type" }
      )
      .select("tmdb_id, media_type, rating, notes, title, year, poster_path, created_at, updated_at")
      .maybeSingle();

    if (error) {
      console.warn("[reviews:upsert] error:", error.message);
      return null;
    }
    if (!data) return null;
    return {
      ...data,
      media_type: data.media_type === "tv" ? "tv" : "movie",
      rating: Number(data.rating),
    };
  } catch (err) {
    console.warn("[reviews:upsert] threw:", err);
    return null;
  }
}

// Borra la review del user para un item. true si se borró, false si no
// había nada o hubo error.
export async function deleteReview(
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("user_reviews")
      .delete()
      .eq("user_id", user.id)
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType);

    if (error) {
      console.warn("[reviews:delete] error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[reviews:delete] threw:", err);
    return false;
  }
}

// Lista de todas las reviews del user actual. Por defecto ordenadas por
// creación descendente. Sin enriquecer (sin título/poster) — el caller lo
// completa cruzando con history/watchlist o llamando TMDB.
export async function getMyReviews(limit = 200): Promise<UserReview[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("user_reviews")
      .select("tmdb_id, media_type, rating, notes, title, year, poster_path, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("[reviews:list] error:", error.message);
      return [];
    }

    return (data ?? []).map((r) => ({
      ...r,
      media_type: r.media_type === "tv" ? "tv" : "movie",
      rating: Number(r.rating),
    }));
  } catch (err) {
    console.warn("[reviews:list] threw:", err);
    return [];
  }
}
