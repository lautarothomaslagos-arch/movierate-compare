import { Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

// 404 global. Next lo usa cuando ninguna ruta matchea.
// (Hay un not-found.tsx específico en /movie/[tmdbId] que tiene prioridad
// para los IDs inválidos.)
export default function GlobalNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Search className="size-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        La URL que buscaste no existe. Probá desde el buscador.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Ir al inicio</Link>
      </Button>
    </main>
  );
}
