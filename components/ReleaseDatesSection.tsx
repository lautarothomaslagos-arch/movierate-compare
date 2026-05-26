import { getLocale, getTranslations } from "next-intl/server";

import { Card } from "@/components/ui/card";
import { getMovieReleaseDates } from "@/lib/tmdb";

// Países "top" — mostramos solo estos para no abrumar.
// El user puede pedir más después con un "Ver más" si lo necesitamos.
const TOP_COUNTRIES = [
  "AR",
  "MX",
  "ES",
  "US",
  "BR",
  "CO",
  "CL",
  "GB",
  "FR",
  "IT",
  "DE",
  "JP",
];

const COUNTRY_NAMES_ES: Record<string, string> = {
  AR: "Argentina",
  MX: "México",
  ES: "España",
  US: "Estados Unidos",
  BR: "Brasil",
  CO: "Colombia",
  CL: "Chile",
  GB: "Reino Unido",
  FR: "Francia",
  IT: "Italia",
  DE: "Alemania",
  JP: "Japón",
};

function flagEmoji(iso: string): string {
  if (iso.length !== 2) return "🌐";
  const base = 0x1f1e6 - "A".charCodeAt(0);
  const codePoints = [...iso.toUpperCase()].map(
    (c) => base + c.charCodeAt(0)
  );
  return String.fromCodePoint(...codePoints);
}

function formatDateShort(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

// TMDB type:
// 1 Premiere, 2 Theatrical (limited), 3 Theatrical, 4 Digital, 5 Physical, 6 TV
// Preferimos theatrical (3 > 2 > 1) y caemos a digital si no hay cine.
function pickPrimaryRelease(
  entries: Array<{ release_date: string; type: number }>
): { date: string; type: number } | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => {
    // Tipo 3 (Theatrical) gana, después 2 (Limited), después 1 (Premiere)
    const priority: Record<number, number> = { 3: 0, 2: 1, 1: 2, 4: 3, 5: 4, 6: 5 };
    return (priority[a.type] ?? 99) - (priority[b.type] ?? 99);
  });
  return { date: sorted[0].release_date, type: sorted[0].type };
}

export async function ReleaseDatesSection({ movieId }: { movieId: number }) {
  const t = await getTranslations("releaseDates");
  const locale = await getLocale();

  let releases;
  try {
    releases = await getMovieReleaseDates(movieId);
  } catch (err) {
    console.warn("[ReleaseDates] failed:", err);
    return null;
  }

  // Mapeamos por iso_3166_1 para acceso rápido
  const byCountry = new Map(
    releases.results.map((r) => [r.iso_3166_1, r.release_dates])
  );

  // Filtramos solo top countries que tienen data
  const rows = TOP_COUNTRIES.map((iso) => {
    const entries = byCountry.get(iso);
    if (!entries || entries.length === 0) return null;
    const primary = pickPrimaryRelease(entries);
    if (!primary) return null;
    return {
      iso,
      name: COUNTRY_NAMES_ES[iso] ?? iso,
      date: primary.date,
      type: primary.type,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {rows.map((r) => (
          <div
            key={r.iso}
            className="flex items-center justify-between text-sm gap-3 py-1 border-b border-border/30 last:border-0 sm:border-0"
          >
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="text-base">
                {flagEmoji(r.iso)}
              </span>
              <span>{r.name}</span>
            </span>
            <span className="text-muted-foreground tabular-nums text-xs sm:text-sm">
              {formatDateShort(r.date, locale)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
