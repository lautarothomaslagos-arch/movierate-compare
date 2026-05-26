// Mapeo de TMDB genre id → clases tailwind para badges con color
// distintivo. Cuando un id no está mapeado, cae al estilo default
// (bg-secondary).
//
// IDs de TMDB para Movies: https://api.themoviedb.org/3/genre/movie/list
// IDs de TMDB para TV: https://api.themoviedb.org/3/genre/tv/list

const COLOR_BY_GENRE: Record<number, string> = {
  // ----- Movies -----
  28: "bg-red-500/20 text-red-300 border-red-500/30", // Action
  12: "bg-amber-500/20 text-amber-300 border-amber-500/30", // Adventure
  16: "bg-pink-500/20 text-pink-300 border-pink-500/30", // Animation
  35: "bg-yellow-500/20 text-yellow-200 border-yellow-500/30", // Comedy
  80: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30", // Crime
  99: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", // Documentary
  18: "bg-purple-500/20 text-purple-300 border-purple-500/30", // Drama
  10751: "bg-green-500/20 text-green-300 border-green-500/30", // Family
  14: "bg-violet-500/20 text-violet-300 border-violet-500/30", // Fantasy
  36: "bg-amber-700/20 text-amber-200 border-amber-700/30", // History
  27: "bg-stone-700/30 text-stone-200 border-stone-700/40", // Horror
  10402: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30", // Music
  9648: "bg-indigo-600/20 text-indigo-300 border-indigo-600/30", // Mystery
  10749: "bg-rose-500/20 text-rose-300 border-rose-500/30", // Romance
  878: "bg-sky-500/20 text-sky-300 border-sky-500/30", // Science Fiction
  10770: "bg-slate-500/20 text-slate-300 border-slate-500/30", // TV Movie
  53: "bg-red-700/20 text-red-300 border-red-700/30", // Thriller
  10752: "bg-stone-600/20 text-stone-300 border-stone-600/30", // War
  37: "bg-orange-700/20 text-orange-200 border-orange-700/30", // Western

  // ----- TV (algunos overlap, otros únicos) -----
  10759: "bg-red-500/20 text-red-300 border-red-500/30", // Action & Adventure
  10762: "bg-green-500/20 text-green-300 border-green-500/30", // Kids
  10763: "bg-blue-500/20 text-blue-300 border-blue-500/30", // News
  10764: "bg-orange-500/20 text-orange-300 border-orange-500/30", // Reality
  10765: "bg-sky-500/20 text-sky-300 border-sky-500/30", // Sci-Fi & Fantasy
  10766: "bg-pink-500/20 text-pink-300 border-pink-500/30", // Soap
  10767: "bg-teal-500/20 text-teal-300 border-teal-500/30", // Talk
  10768: "bg-stone-600/20 text-stone-300 border-stone-600/30", // War & Politics
};

export function genreBadgeClass(genreId: number): string {
  return (
    COLOR_BY_GENRE[genreId] ??
    "bg-secondary text-secondary-foreground border-border"
  );
}
