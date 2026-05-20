import { Tv } from "lucide-react";
import { Link } from "@/i18n/navigation";

import { Button } from "@/components/ui/button";

export default function SerieNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Tv className="size-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold">No encontramos esta serie</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        El ID que buscaste no existe en TMDB o hubo un problema cargando los
        datos.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Volver al buscador</Link>
      </Button>
    </main>
  );
}
