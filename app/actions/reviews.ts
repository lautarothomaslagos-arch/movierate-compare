"use server";

import { revalidatePath } from "next/cache";

import { upsertReview, deleteReview } from "@/lib/reviews";

// Wrappers de Server Actions sobre lib/reviews.ts. El componente cliente
// los invoca con startTransition. Cada acción revalida /mis-reviews.

export async function upsertReviewAction(input: {
  tmdb_id: number;
  media_type: "movie" | "tv";
  rating: number;
  notes: string | null;
  title: string;
  year: number | null;
  poster_path: string | null;
}) {
  const result = await upsertReview(input);
  if (!result) return { error: "save-failed" as const };
  revalidatePath("/mis-reviews");
  return { ok: true as const };
}

export async function deleteReviewAction(
  tmdbId: number,
  mediaType: "movie" | "tv"
) {
  const ok = await deleteReview(tmdbId, mediaType);
  if (!ok) return { error: "delete-failed" as const };
  revalidatePath("/mis-reviews");
  return { ok: true as const };
}
