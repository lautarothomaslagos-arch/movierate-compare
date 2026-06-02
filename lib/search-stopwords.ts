// Helper para limpiar queries de búsqueda en español:
// quita artículos, demostrativos, conectores y muletillas que TMDB no
// matchea bien. Por ejemplo:
//   "la peli del padrino" → "padrino"
//   "esa de los hobbits" → "hobbits"
//   "una serie de Tom Hanks" → "Tom Hanks"
//
// Estrategia conservadora:
//   - SOLO se aplica si el query tiene 3+ palabras (no rompemos "el",
//     "it", "her" como búsquedas válidas).
//   - Si el resultado queda con menos de 2 caracteres, devolvemos el
//     original (no agresivo).
//   - Quitamos también frases compuestas comunes ("la peli de", "esa
//     serie de", etc.) antes de hacer split por palabras.

const STOPWORDS = new Set([
  // Artículos
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  // Preposiciones cortas
  "de",
  "del",
  "al",
  "a",
  "en",
  "con",
  "por",
  "para",
  // Conectores
  "y",
  "o",
  "u",
  "ni",
  "que",
  "como",
  "donde",
  "cuando",
  // Demostrativos
  "este",
  "esta",
  "estos",
  "estas",
  "ese",
  "esa",
  "esos",
  "esas",
  "aquel",
  "aquella",
  "aquellos",
  "aquellas",
  // Auxiliares
  "es",
  "son",
  "era",
  "fue",
  "ser",
  // Genéricos del dominio
  "peli",
  "pelicula",
  "película",
  "pelis",
  "peliculas",
  "películas",
  "film",
  "films",
  "serie",
  "series",
  "show",
  "shows",
  "movie",
  "movies",
  // English stopwords comunes (en queries mezclados)
  "the",
  "a",
  "an",
  "and",
  "of",
  "in",
]);

// Frases compuestas a remover ANTES del tokenizado. Importantes porque
// "la peli del" en split queda como ["la", "peli", "del"] y queremos
// removerlas como bloque para no dejar "del" suelto si forma parte
// de "del Padrino".
const COMPOUND_PHRASES = [
  "la peli de",
  "la pelicula de",
  "la película de",
  "una peli de",
  "una pelicula de",
  "una película de",
  "esa peli de",
  "esa pelicula de",
  "esa película de",
  "esta peli de",
  "esta pelicula de",
  "esta película de",
  "la serie de",
  "una serie de",
  "esa serie de",
  "esta serie de",
  "el film de",
  "la que",
  "el que",
  "los que",
  "las que",
  "esa que",
  "ese que",
  "esas que",
  "esos que",
];

export function stripStopwords(query: string): string {
  const original = query.trim();
  if (!original) return original;

  // Quitar acentos para comparar contra stopwords (case-insensitive).
  const noAccents = original
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  // Solo aplicamos si tiene 3+ palabras (queries cortos quedan intactos)
  const wordCount = noAccents.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 3) return original;

  let working = noAccents.toLowerCase();

  // Quitar frases compuestas (más largo primero)
  const sortedPhrases = [...COMPOUND_PHRASES].sort(
    (a, b) => b.length - a.length
  );
  for (const phrase of sortedPhrases) {
    working = working.replace(new RegExp(`\\b${phrase}\\b`, "g"), " ");
  }

  // Tokenizar y filtrar stopwords individuales
  const tokens = working
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !STOPWORDS.has(t));

  const cleaned = tokens.join(" ").trim();

  // Safety: si limpiamos demasiado y quedó casi nada, mejor volvemos al original
  if (cleaned.length < 2) return original;

  return cleaned;
}
