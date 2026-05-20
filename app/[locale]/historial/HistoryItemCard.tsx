"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Item visual del historial. El onDelete es genérico — sirve tanto para
// borrar de DB (server action) como de localStorage (sync).
// media_type opcional (default 'movie') determina si linkea a /movie/[id]
// o /serie/[id], y muestra badge correspondiente.
export function HistoryItemCard({
  tmdb_id,
  media_type = "movie",
  title,
  year,
  poster_path,
  onDelete,
}: {
  tmdb_id: number;
  media_type?: "movie" | "tv";
  title: string;
  year: number | null;
  poster_path: string | null;
  onDelete: (
    id: number,
    mediaType: "movie" | "tv"
  ) => void | Promise<{ error?: string; ok?: true }>;
}) {
  const [isPending, startTransition] = useTransition();
  const href = media_type === "tv" ? `/serie/${tmdb_id}` : `/movie/${tmdb_id}`;

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const r = await onDelete(tmdb_id, media_type);
      if (r && "error" in r && r.error) {
        toast.error("No se pudo eliminar.");
      }
    });
  }

  return (
    <Card className="p-3 flex gap-3 items-center group">
      <Link
        href={href}
        className="relative shrink-0 w-12 h-16 bg-muted rounded overflow-hidden ring-1 ring-border"
      >
        {poster_path && (
          <Image
            src={`https://image.tmdb.org/t/p/w92${poster_path}`}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        )}
      </Link>
      <Link href={href} className="flex-1 min-w-0 hover:underline">
        <div className="text-sm font-medium truncate flex items-center gap-1.5">
          <span className="truncate">{title}</span>
          <span
            className={cn(
              "shrink-0 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
              media_type === "tv"
                ? "bg-purple-500/15 text-purple-400"
                : "bg-blue-500/15 text-blue-400"
            )}
          >
            {media_type === "tv" ? "Serie" : "Peli"}
          </span>
        </div>
        {year !== null && (
          <div className="text-xs text-muted-foreground">{year}</div>
        )}
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={isPending}
        aria-label={`Eliminar ${title} del historial`}
        className="text-muted-foreground hover:text-destructive sm:opacity-60 group-hover:opacity-100"
      >
        <Trash2 className="size-4" />
      </Button>
    </Card>
  );
}
