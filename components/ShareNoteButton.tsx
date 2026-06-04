"use client";

import { Download, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Botón "Compartir como imagen" para una review guardada. Genera una
// share-card 1080×1080 del lado server (cacheada) y la abre en un modal
// con opciones de compartir (Web Share API con archivo) o descargar.
//
// El share como archivo solo funciona en mobile + browsers con
// navigator.canShare con files. Si no anda, cae al fallback de descargar.

interface ShareNoteButtonProps {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  rating: number;
  userName?: string | null;
}

export function ShareNoteButton({
  tmdb_id,
  media_type,
  title,
  rating,
  userName,
}: ShareNoteButtonProps) {
  const t = useTranslations("shareNote");
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  // URL del endpoint que genera la imagen. Cacheada server-side por params.
  const params = new URLSearchParams();
  params.set("rating", rating.toString());
  if (userName) params.set("name", userName);
  const imageUrl = `/api/share-card/${media_type}/${tmdb_id}?${params.toString()}`;

  async function handleShareNative() {
    setSharing(true);
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error("image fetch failed");
      const blob = await res.blob();
      const file = new File([blob], `mi-nota-${tmdb_id}.png`, {
        type: "image/png",
      });
      const shareData: ShareData = {
        title: t("shareTitle"),
        text: t("shareText", { title, rating: rating.toFixed(1) }),
        files: [file],
      };
      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare(shareData)
      ) {
        try {
          await navigator.share(shareData);
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          throw err;
        }
      } else {
        // Fallback: descargar
        handleDownload(blob);
      }
    } catch (err) {
      console.warn("[share-note] share failed:", err);
      toast.error(t("shareFailed"));
    } finally {
      setSharing(false);
    }
  }

  function handleDownload(blob?: Blob) {
    // Si vino el blob del flow nativo, lo usamos. Si no, fetcheamos.
    const run = async () => {
      let b: Blob;
      if (blob) {
        b = blob;
      } else {
        const r = await fetch(imageUrl);
        if (!r.ok) throw new Error("image fetch failed");
        b = await r.blob();
      }
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mi-nota-${tmdb_id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t("downloaded"));
    };
    run().catch((err) => {
      console.warn("[share-note] download failed:", err);
      toast.error(t("downloadFailed"));
    });
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
        className="gap-1.5"
      >
        <Share2 className="size-4" />
        {t("shareAsImage")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="font-serif italic font-normal text-2xl">
              {t("modalTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="px-5">
            {/* Preview de la imagen. next/image no funciona con API routes
                dinámicas; usamos img nativo. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={t("previewAlt")}
              className="w-full rounded-lg border border-border/40 bg-muted"
              width={1080}
              height={1080}
            />
          </div>

          <div className="flex gap-2 p-5">
            <Button
              onClick={handleShareNative}
              disabled={sharing}
              className="flex-1"
            >
              <Share2 className="size-4" />
              {t("share")}
            </Button>
            <Button
              onClick={() => handleDownload()}
              variant="outline"
              disabled={sharing}
            >
              <Download className="size-4" />
              {t("download")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
