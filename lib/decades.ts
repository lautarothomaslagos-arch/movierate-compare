// Mapeo de keys de década → rango de años. Usado por /top (decade picker).
// "all" = sin filtro; "classics" = todo lo previo a 1980.

export type DecadeKey =
  | "all"
  | "2020s"
  | "2010s"
  | "2000s"
  | "90s"
  | "80s"
  | "classics";

export const DECADE_KEYS: DecadeKey[] = [
  "all",
  "2020s",
  "2010s",
  "2000s",
  "90s",
  "80s",
  "classics",
];

// Cada decade clave a su rango (yearFrom, yearTo). Si yearFrom undefined →
// sin límite inferior; si yearTo undefined → sin límite superior.
export function decadeToRange(decade: DecadeKey): {
  yearFrom?: number;
  yearTo?: number;
} {
  switch (decade) {
    case "2020s":
      return { yearFrom: 2020, yearTo: 2029 };
    case "2010s":
      return { yearFrom: 2010, yearTo: 2019 };
    case "2000s":
      return { yearFrom: 2000, yearTo: 2009 };
    case "90s":
      return { yearFrom: 1990, yearTo: 1999 };
    case "80s":
      return { yearFrom: 1980, yearTo: 1989 };
    case "classics":
      return { yearTo: 1979 };
    case "all":
    default:
      return {};
  }
}

export function parseDecade(value: string | undefined): DecadeKey {
  if (!value) return "all";
  const lower = value.toLowerCase();
  return (DECADE_KEYS as string[]).includes(lower)
    ? (lower as DecadeKey)
    : "all";
}
