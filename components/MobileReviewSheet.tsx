"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { upsertReviewAction } from "@/app/actions/reviews";
import { BrandStar } from "@/components/BrandStar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Bottom sheet de "Mi nota" para mobile. En vez de scrollear hasta el
// ReviewSection abajo de la página, esto se abre desde la base con el
// formulario chiquito (slider + estrella signoff + textarea).
//
// Después de guardar, hace router.refresh() para que el Server Component
// de ReviewSection se actualice automáticamente. Cierra el sheet.

interface MobileReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLogged: boolean;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
  initialReview: { rating: number; notes: string | null } | null;
}

export function MobileReviewSheet({
  open,
  onOpenChange,
  isLogged,
  tmdb_id,
  media_type,
  title,
  year,
  poster_path,
  initialReview,
}: MobileReviewSheetProps) {
  const t = useTranslations("reviews");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const [rating, setRating] = useState<number>(initialReview?.rating ?? 7);
  const [notes, setNotes] = useState<string>(initialReview?.notes ?? "");
  const [isPending, startTransition] = useTransition();

  // Si se abre el sheet con nueva review (otro título), sincronizamos los valores.
  useEffect(() => {
    if (open) {
      setRating(initialReview?.rating ?? 7);
      setNotes(initialReview?.notes ?? "");
    }
  }, [open, initialReview?.rating, initialReview?.notes]);

  function handleSave() {
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
      if ("error" in r) {
        toast.error(t("saveError"));
        return;
      }
      toast.success(t("saved"));
      // Refresca el Server Component de ReviewSection para mostrar la nueva
      router.refresh();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Bottom sheet: anclado a la base, slide-up. Solo mobile. En desktop
          el sheet igual se ve, pero el modal queda en la parte inferior. */}
      <DialogContent
        className={
          // Posición: inset-x-0 + bottom-0, NO centrado. Override Radix defaults.
          "left-0 right-0 bottom-0 top-auto translate-x-0 translate-y-0 " +
          "w-full max-w-full " +
          "rounded-t-2xl rounded-b-none border-x-0 border-b-0 border-t " +
          "max-h-[85vh] " +
          "p-0 gap-0 flex flex-col"
        }
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Handle bar visual (no funcional, solo guía) */}
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <DialogHeader className="px-5 pt-2 pb-3 shrink-0 text-left">
          <DialogTitle className="font-serif italic font-normal text-2xl leading-tight">
            {t("heading")}
          </DialogTitle>
          <p className="text-xs text-muted-foreground truncate">
            {title}
            {year && <span className="opacity-70"> · {year}</span>}
          </p>
        </DialogHeader>

        {!isLogged ? (
          // CTA de login: el user puede leer/explorar pero solo puede calificar
          // si tiene sesión.
          <div className="px-5 pb-5 flex-1 min-h-0">
            <div className="rounded-lg border border-dashed p-5 flex items-start gap-3">
              <div className="shrink-0 rounded-full bg-primary/10 p-2 text-foreground">
                <BrandStar size={22} fillPct={0.1} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold">{t("loginCtaTitle")}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("loginCtaBody")}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  <em>{tAuth("signIn")}</em> →{" "}
                  <Link
                    href="/"
                    className="text-primary hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    {t("loginCtaHint")}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-5 flex-1 min-h-0 overflow-y-auto space-y-4">
            <div>
              {/* Header del slider con la estrella signoff que se llena
                  en vivo con la nota. Mismo patrón que ReviewSection. */}
              <div className="flex items-center justify-between mb-2 gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("yourRatingLabel")}
                </label>
                <span className="inline-flex items-center gap-2 leading-none text-foreground">
                  <BrandStar
                    size={32}
                    fillPct={Math.max(0, Math.min(1, rating / 10))}
                  />
                  <span className="font-serif italic font-normal text-3xl tabular-nums text-primary inline-flex items-baseline gap-1">
                    {rating.toFixed(1)}
                    <span className="font-sans not-italic text-xs text-muted-foreground">/10</span>
                  </span>
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
                {t("yourNotesLabel")}{" "}
                <span className="font-normal normal-case text-muted-foreground">
                  ({t("notesOptional")})
                </span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                rows={3}
                maxLength={2000}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-md border bg-background",
                  "border-input focus:border-primary focus:outline-none",
                  "resize-y min-h-[70px]"
                )}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1"
              >
                {t("saveBtn")}
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                disabled={isPending}
              >
                {t("cancelBtn")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
