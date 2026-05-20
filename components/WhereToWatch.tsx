import { Tv } from "lucide-react";
import Image from "next/image";
import { headers } from "next/headers";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTvWatchProviders, getWatchProviders } from "@/lib/tmdb";
import type { TmdbProvider } from "@/types/movie";

// Mapeo de código ISO de país a nombre legible en español.
// Solo cubrimos los más comunes para la UI; el resto cae al código.
const COUNTRY_NAMES: Record<string, string> = {
  AR: "Argentina",
  MX: "México",
  ES: "España",
  US: "Estados Unidos",
  CL: "Chile",
  CO: "Colombia",
  PE: "Perú",
  UY: "Uruguay",
  BR: "Brasil",
  EC: "Ecuador",
  BO: "Bolivia",
  PY: "Paraguay",
  VE: "Venezuela",
  GT: "Guatemala",
  CR: "Costa Rica",
  PA: "Panamá",
  DO: "República Dominicana",
};

function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}

// Detección de región:
// 1. Header x-vercel-ip-country (lo agrega Vercel automáticamente en producción)
// 2. Si no hay (localhost / otra plataforma), fallback a AR
async function detectRegion(): Promise<string> {
  const h = await headers();
  const country = h.get("x-vercel-ip-country");
  if (country && country.length === 2) return country.toUpperCase();
  return "AR";
}

// Card por provider de streaming (con logo)
function ProviderLogo({
  provider,
  link,
}: {
  provider: TmdbProvider;
  link: string | undefined;
}) {
  const logo = provider.logo_path
    ? `https://image.tmdb.org/t/p/original${provider.logo_path}`
    : null;
  const inner = (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/60 hover:bg-secondary transition-colors">
      <div className="relative size-8 rounded-md overflow-hidden bg-background shrink-0 ring-1 ring-border">
        {logo ? (
          <Image
            src={logo}
            alt={provider.provider_name}
            fill
            sizes="32px"
            className="object-contain"
            unoptimized
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Tv className="size-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <span className="text-xs font-medium truncate max-w-[140px]">
        {provider.provider_name}
      </span>
    </div>
  );

  if (!link) return inner;
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Ver en ${provider.provider_name}`}
    >
      {inner}
    </a>
  );
}

// Server Component async. Lo envolvemos en Suspense desde el page padre.
// Sirve tanto para movies como para tv — el mediaType determina qué endpoint
// de TMDB se consulta.
export async function WhereToWatch({
  tmdbId,
  mediaType = "movie",
}: {
  tmdbId: number;
  mediaType?: "movie" | "tv";
}) {
  const region = await detectRegion();

  let data;
  try {
    data =
      mediaType === "tv"
        ? await getTvWatchProviders(tmdbId)
        : await getWatchProviders(tmdbId);
  } catch (err) {
    console.warn("[WhereToWatch] failed:", err);
    return null; // si falla, no mostramos nada en absoluto
  }

  const regionData = data.results[region];

  if (!regionData) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin información de streaming en {countryName(region)} por el momento.
      </p>
    );
  }

  const flatrate = regionData.flatrate ?? [];
  const rent = regionData.rent ?? [];
  const buy = regionData.buy ?? [];
  const free = regionData.free ?? [];

  // Si no hay ningún provider en absoluto
  if (
    flatrate.length === 0 &&
    rent.length === 0 &&
    buy.length === 0 &&
    free.length === 0
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        No está disponible en streaming en {countryName(region)} por ahora.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Disponible en {countryName(region)}{" "}
        <span className="opacity-60">
          (datos de JustWatch via TMDB · click → abre en el proveedor)
        </span>
      </p>

      {flatrate.length > 0 && (
        <ProviderRow
          title="Con suscripción"
          providers={flatrate}
          link={regionData.link}
        />
      )}
      {free.length > 0 && (
        <ProviderRow title="Gratis" providers={free} link={regionData.link} />
      )}
      {rent.length > 0 && (
        <ProviderRow
          title="Alquilar"
          providers={rent}
          link={regionData.link}
        />
      )}
      {buy.length > 0 && (
        <ProviderRow title="Comprar" providers={buy} link={regionData.link} />
      )}
    </div>
  );
}

function ProviderRow({
  title,
  providers,
  link,
}: {
  title: string;
  providers: TmdbProvider[];
  link: string | undefined;
}) {
  return (
    <Card className="p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {providers.slice(0, 8).map((p) => (
          <ProviderLogo key={p.provider_id} provider={p} link={link} />
        ))}
      </div>
    </Card>
  );
}

export function WhereToWatchSkeleton() {
  return (
    <Card className="p-3 space-y-2">
      <Skeleton className="h-3 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </Card>
  );
}
