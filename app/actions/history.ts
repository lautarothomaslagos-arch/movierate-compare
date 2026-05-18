"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Server actions para mutar history desde la página /historial.
// RLS garantiza que cada user solo puede afectar sus propias rows.

export async function deleteHistoryItem(tmdbId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "no-session" };

  const { error } = await supabase
    .from("history")
    .delete()
    .eq("user_id", user.id)
    .eq("tmdb_id", tmdbId);

  if (error) {
    console.warn("[history:delete] error:", error.message);
    return { error: error.message };
  }

  revalidatePath("/historial");
  return { ok: true as const };
}

export async function clearAllHistory() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "no-session" };

  const { error } = await supabase
    .from("history")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.warn("[history:clear] error:", error.message);
    return { error: error.message };
  }

  revalidatePath("/historial");
  return { ok: true as const };
}
