"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";

type Actor = {
  id: number;
  name: string;
  character?: string | null;
  profile_path?: string | null;
};

// Contenido pesado del modal (Radix Dialog + Input + grid de hasta 100+ actores).
// Se carga por next/dynamic desde FullCastModal solo cuando se abre por primera
// vez, así no contamina el initial bundle de la página detalle.
export default function FullCastDialog({
  cast,
  open,
  onOpenChange,
}: {
  cast: Actor[];
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const t = useTranslations("fullCast");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cast;
    return cast.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.character ?? "").toLowerCase().includes(q)
    );
  }, [cast, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("heading")}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus={false}
          />
        </div>

        <p className="text-xs text-muted-foreground -mt-2">
          {t("totalCount", { count: filtered.length })}
        </p>

        <div className="overflow-y-auto pr-1 -mr-1 min-h-0 flex-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("noResults")}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filtered.map((actor) => {
                const profile = actor.profile_path
                  ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                  : null;
                return (
                  <Link
                    key={actor.id}
                    href={`/actor/${actor.id}`}
                    onClick={() => onOpenChange(false)}
                    className="group text-center"
                    prefetch={false}
                  >
                    <div className="poster-frame relative aspect-[2/3] bg-muted rounded-md overflow-hidden mb-1.5 ring-1 ring-border group-hover:ring-primary/60">
                      {profile ? (
                        <Image
                          src={profile}
                          alt={actor.name}
                          fill
                          sizes="(min-width: 768px) 120px, 30vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-2xl">
                          ?
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                      {actor.name}
                    </div>
                    {actor.character && (
                      <div className="text-xs text-muted-foreground truncate">
                        {actor.character}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
