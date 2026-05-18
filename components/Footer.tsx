export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/50 mt-auto">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 text-xs text-muted-foreground">
        <p>
          Datos de IMDb, Rotten Tomatoes y Metacritic vía OMDb. Letterboxd y
          Filmaffinity no proveen API pública — los datos pueden no estar
          disponibles temporalmente. Información de películas por TMDB.
        </p>
      </div>
    </footer>
  );
}
