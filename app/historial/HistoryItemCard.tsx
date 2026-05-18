"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Item visual del historial. El onDelete es genérico — sirve tanto para
// borrar de DB (server action) como de localStorage (sync).
export function HistoryItemCard({
  tmdb_id,
  title,
  year,
  poster_path,
  onDelete,
}: {
  tmdb_id: number;
  title: string;
  year: number | null;
  poster_path: string | null;
  onDelete: (id: number) => void | Promise<{ error?: string; ok?: true }>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const r = await onDelete(tmdb_id);
      if (r && "error" in r && r.error) {
        toast.error("No se pudo eliminar.");
      }
    });
  }

  return (
    <Card className="p-3 flex gap-3 items-center group">
      <Link
        href={`/movie/${tmdb_id}`}
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
      <Link
        href={`/movie/${tmdb_id}`}
        className="flex-1 min-w-0 hover:underline"
      >
        <div className="text-sm font-medium truncate">{title}</div>
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
        className="text-muted-foreground hover:text-destructive opacity-60 group-hover:opacity-100"
      >
        <Trash2 className="size-4" />
      </Button>
    </Card>
  );
}
