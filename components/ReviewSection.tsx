"use client";

import { Pencil, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteReviewAction,
  upsertReviewAction,
} from "@/app/actions/reviews";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  // Datos del item para snapshotear al guardar la review
  title: string;
  year: number | null;
  poster_path: string | null;
  isLogged: boolean;
  // Estado inicial fetched server-side. Si no hay review aún, null.
  initialReview: {
    rating: number;
    notes: string | null;
    updated_at: string;
  } | null;
};

// Card de "Mi review" en página detalle. Permite poner un rating 0-10
// (paso 0.5) y notas opcionales. Si no hay sesión, muestra un CTA para
// iniciar sesión. La acción se envía via Server Action (no API route).
export function ReviewSection({
  tmdb_id,
  media_type,
  title,
  year,
  poster_path,
  isLogged,
  initialReview,
}: Props) {
  const t = useTranslations("reviews");
  const tAuth = useTranslations("auth");
  const [review, setReview] = useState(initialReview);
  const [editing, setEditing] = useState(initialReview === null && isLogged);
  const [rating, setRating] = useState<number>(initialReview?.rating ?? 7);
  const [notes, setNotes] = useState<string>(initialReview?.notes ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!isLogged) return;
    startTransition(async () => {
      const r = await upsertReviewAction({
        tmdb_id,
        media_type,
        rating,
        notes: notes.trim() || null,
        title,
        year,
        poster_path,
      });
      if ("error" in r && r.error) {
        toast.error(t("saveError"));
        return;
      }
      setReview({
        rating,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      });
      setEditing(false);
      toast.success(t("saved"));
    });
  }

  function handleDelete() {
    if (!isLogged) return;
    if (!confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      const r = await deleteReviewAction(tmdb_id, media_type);
      if ("error" in r && r.error) {
        toast.error(t("deleteError"));
        return;
      }
      setReview(null);
      setEditing(true); // queda listo para volver a escribir
      setRating(7);
      setNotes("");
      toast.success(t("deleted"));
    });
  }

  function handleCancel() {
    setRating(review?.rating ?? 7);
    setNotes(review?.notes ?? "");
    setEditing(false);
  }

  // Estado: NO logueado → CTA
  if (!isLogged) {
    return (
      <Card className="p-4 sm:p-5 border-dashed">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-full bg-primary/10 p-2">
            <Star className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">{t("loginCtaTitle")}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t("loginCtaBody")}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              <em>{tAuth("signIn")}</em> →{" "}
              {t("loginCtaHint")}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Estado: logueado + sin review + no editando → CTA de crear
  // Esto en realidad no ocurre porque editing se inicializa true cuando no
  // hay review. Pero por defensa lo cubrimos.
  if (!review && !editing) {
    return (
      <Card className="p-4 sm:p-5">
        <Button
          onClick={() => setEditing(true)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Pencil className="size-4" />
          {t("addReviewBtn")}
        </Button>
      </Card>
    );
  }

  // Estado: viendo review existente
  if (review && !editing) {
    const dt = new Date(review.updated_at);
    return (
      <Card className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("yourRatingLabel")}
            </div>
            <div className="mt-1 inline-flex items-baseline gap-1.5">
              <span className="font-serif italic font-normal text-4xl sm:text-5xl tabular-nums leading-none text-primary">
                {review.rating.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">/10</span>
              <Star className="size-5 fill-amber-400 text-amber-400 ml-1" />
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button
              onClick={() => setEditing(true)}
              size="sm"
              variant="ghost"
              aria-label={t("editAria")}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              onClick={handleDelete}
              size="sm"
              variant="ghost"
              disabled={isPending}
              aria-label={t("deleteAria")}
            >
              <Trash2 className="size-4 text-rose-400" />
            </Button>
          </div>
        </div>

        {review.notes && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              {t("yourNotesLabel")}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {review.notes}
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-1 border-t border-border/40">
          {t("savedAt", { date: dt.toLocaleDateString() })}
        </div>
      </Card>
    );
  }

  // Estado: editando (crear o modificar)
  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("yourRatingLabel")}
          </label>
          <span className="font-serif italic font-normal text-3xl tabular-nums leading-none text-primary inline-flex items-baseline gap-1">
            {rating.toFixed(1)}
            <span className="font-sans not-italic text-xs text-muted-foreground">/10</span>
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={rating}
          onChange={(e) => setRating(parseFloat(e.target.value))}
          aria-label={t("yourRatingLabel")}
          aria-valuetext={`${rating.toFixed(1)} de 10`}
          className="w-full accent-amber-400"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1.5">
          {t("yourNotesLabel")} <span className="font-normal normal-case text-muted-foreground">({t("notesOptional")})</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesPlaceholder")}
          rows={4}
          maxLength={2000}
          className={cn(
            "w-full px-3 py-2 text-sm rounded-md border bg-background",
            "border-input focus:border-primary focus:outline-none",
            "resize-y min-h-[80px]"
          )}
        />
        <div className="text-[10px] text-muted-foreground text-right mt-1">
          {notes.length} / 2000
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={isPending}
          size="sm"
          className="flex-1"
        >
          {t("saveBtn")}
        </Button>
        {review && (
          <Button
            onClick={handleCancel}
            disabled={isPending}
            size="sm"
            variant="outline"
          >
            {t("cancelBtn")}
          </Button>
        )}
      </div>
    </Card>
  );
}
