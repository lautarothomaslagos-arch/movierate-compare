import { Suspense } from "react";

import { AuthErrorToast } from "@/components/AuthErrorToast";
import { SearchBar } from "@/components/SearchBar";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24">
      {/* Suspense porque useSearchParams es client-only y requiere boundary */}
      <Suspense fallback={null}>
        <AuthErrorToast />
      </Suspense>

      <div className="w-full max-w-2xl flex flex-col items-center gap-8 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            MovieRate <span className="text-muted-foreground">Compare</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
            Compará el rating de una peli en IMDb, Rotten Tomatoes, Metacritic, TMDB, Letterboxd y Filmaffinity de una sola búsqueda.
          </p>
        </div>

        <div className="w-full">
          <SearchBar />
          <p className="text-xs text-muted-foreground mt-2">
            Tipeá al menos 2 caracteres
          </p>
        </div>
      </div>
    </main>
  );
}
