import Link from "next/link";

import { BrandStar } from "@/components/BrandStar";
import { Button } from "@/components/ui/button";

// 404 global. Next lo usa cuando ninguna ruta matchea.
// (Hay un not-found.tsx específico en /movie/[tmdbId] que tiene prioridad
// para los IDs inválidos.)
//
// Usa el isotipo con fill bajo (8%) — leído como "la nota no llegó" /
// "esta página no existe todavía". Coherente con el sistema "Estrella-nota".
export default function GlobalNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="text-foreground mb-6 opacity-90">
        <BrandStar size={72} fillPct={0.08} />
      </div>
      <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground mb-2">
        404
      </p>
      <h1 className="font-serif italic text-3xl sm:text-4xl">
        Página no encontrada
      </h1>
      <p className="text-muted-foreground mt-3 max-w-md">
        La URL que buscaste no existe. Probá desde el buscador.
      </p>
      <Button asChild className="mt-7">
        <Link href="/">Ir al inicio</Link>
      </Button>
    </main>
  );
}
