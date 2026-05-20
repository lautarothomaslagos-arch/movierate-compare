import { UserX } from "lucide-react";
import { Link } from "@/i18n/navigation";

import { Button } from "@/components/ui/button";

export default function ActorNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <UserX className="size-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold">No encontramos esta persona</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        El ID que buscaste no existe en TMDB.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Volver al buscador</Link>
      </Button>
    </main>
  );
}
