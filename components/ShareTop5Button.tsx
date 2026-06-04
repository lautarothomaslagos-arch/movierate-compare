"use client";

import { Download, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Botón "Compartir Top 5" — abre modal con preview de la imagen 1080×1920
// generada por /api/share-card/top5 + opciones de Web Share o descarga.

export function ShareTop5Button() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const imageUrl = "/api/share-card/top5";

  async function handleShare() {
    setBusy(true);
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error("image fetch failed");
      const blob = await res.blob();
      const file = new File([blob], "mi-top-5.png", { type: "image/png" });
      const data: ShareData = {
        title: "Mi Top 5 — MovieRate Compare",
        text: "Mis 5 favoritas, sus puntajes promedio.",
        files: [file],
      };
      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare(data)
      ) {
        try {
          await navigator.share(data);
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          throw err;
        }
      } else {
        handleDownload(blob);
      }
    } catch (err) {
      console.warn("[share-top5] failed:", err);
      toast.error("No se pudo compartir. Probá descargar.");
    } finally {
      setBusy(false);
    }
  }

  function handleDownload(prefetched?: Blob) {
    const run = async () => {
      let blob: Blob;
      if (prefetched) {
        blob = prefetched;
      } else {
        const r = await fetch(imageUrl);
        if (!r.ok) throw new Error("image fetch failed");
        blob = await r.blob();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mi-top-5.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Imagen descargada");
    };
    run().catch((err) => {
      console.warn("[share-top5] download failed:", err);
      toast.error("No se pudo descargar.");
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Share2 className="size-4" />
        Generar Top 5
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="font-serif italic font-normal text-2xl">
              Mi Top 5, listo
            </DialogTitle>
          </DialogHeader>

          <div className="px-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Preview Top 5"
              className="w-full rounded-lg border border-border/40 bg-muted"
              width={1080}
              height={1920}
            />
          </div>

          <div className="flex gap-2 p-5">
            <Button onClick={handleShare} disabled={busy} className="flex-1">
              <Share2 className="size-4" />
              Compartir
            </Button>
            <Button
              onClick={() => handleDownload()}
              variant="outline"
              disabled={busy}
            >
              <Download className="size-4" />
              Descargar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
