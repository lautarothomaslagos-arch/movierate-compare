import { Building2, Coins, Globe2, Languages, Tv2 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";

import { Card } from "@/components/ui/card";

// Bandera emoji por código ISO 3166-1 alpha-2. Calculado dinámicamente:
// cada letra se convierte al Regional Indicator Symbol (U+1F1E6+offset).
function flagEmoji(iso: string): string {
  if (iso.length !== 2) return "🌐";
  const base = 0x1f1e6 - "A".charCodeAt(0);
  const codePoints = [...iso.toUpperCase()].map(
    (c) => base + c.charCodeAt(0)
  );
  return String.fromCodePoint(...codePoints);
}

function formatMoney(amount: number, locale: string): string {
  if (amount < 1_000) return `$${amount}`;
  if (amount < 1_000_000) return `$${Math.round(amount / 1000)}K`;
  if (amount < 1_000_000_000) {
    return `$${(amount / 1_000_000).toLocaleString(locale, {
      maximumFractionDigits: 1,
    })}M`;
  }
  return `$${(amount / 1_000_000_000).toLocaleString(locale, {
    maximumFractionDigits: 2,
  })}B`;
}

type Props = {
  // Cualquier combinación es opcional — si todo está vacío, el componente
  // devuelve null y la sección no se renderiza.
  studios?: Array<{ id: number; name: string; logo_path?: string | null }>;
  countries?: Array<{ iso_3166_1: string; name: string }>;
  languages?: Array<{ name: string; english_name?: string | null }>;
  budget?: number | null;
  revenue?: number | null;
  networks?: Array<{ id: number; name: string; logo_path?: string | null }>;
};

export async function ProductionSection({
  studios = [],
  countries = [],
  languages = [],
  budget,
  revenue,
  networks = [],
}: Props) {
  const t = await getTranslations("production");
  const locale = await getLocale();

  const hasMoney =
    (budget !== null && budget !== undefined && budget > 0) ||
    (revenue !== null && revenue !== undefined && revenue > 0);

  const hasContent =
    studios.length > 0 ||
    countries.length > 0 ||
    languages.length > 0 ||
    networks.length > 0 ||
    hasMoney;

  if (!hasContent) return null;

  return (
    <Card className="p-4 space-y-4">
      {/* Networks (solo series) */}
      {networks.length > 0 && (
        <Row icon={<Tv2 className="size-4" />} label={
          networks.length === 1 ? t("network") : t("networksPlural")
        }>
          <div className="flex flex-wrap gap-2">
            {networks.map((n) => (
              <CompanyChip key={n.id} name={n.name} logoPath={n.logo_path} />
            ))}
          </div>
        </Row>
      )}

      {/* Studios */}
      {studios.length > 0 && (
        <Row icon={<Building2 className="size-4" />} label={t("studios")}>
          <div className="flex flex-wrap gap-2">
            {studios.slice(0, 8).map((s) => (
              <CompanyChip key={s.id} name={s.name} logoPath={s.logo_path} />
            ))}
          </div>
        </Row>
      )}

      {/* Countries con flag */}
      {countries.length > 0 && (
        <Row
          icon={<Globe2 className="size-4" />}
          label={
            countries.length === 1 ? t("countries") : t("countriesPlural")
          }
        >
          <div className="flex flex-wrap gap-2 text-sm">
            {countries.map((c) => (
              <span
                key={c.iso_3166_1}
                className="inline-flex items-center gap-1.5"
              >
                <span aria-hidden>{flagEmoji(c.iso_3166_1)}</span>
                {c.name}
              </span>
            ))}
          </div>
        </Row>
      )}

      {/* Languages */}
      {languages.length > 0 && (
        <Row icon={<Languages className="size-4" />} label={t("languages")}>
          <div className="text-sm">
            {languages.map((l) => l.english_name ?? l.name).join(" · ")}
          </div>
        </Row>
      )}

      {/* Budget / Revenue */}
      {hasMoney && (
        <Row icon={<Coins className="size-4" />} label={t("budget")}>
          <div className="flex flex-wrap gap-4 text-sm">
            {budget !== null && budget !== undefined && budget > 0 && (
              <div>
                <span className="text-muted-foreground">{t("budget")}: </span>
                <span className="font-medium tabular-nums">
                  {formatMoney(budget, locale)}
                </span>
              </div>
            )}
            {revenue !== null && revenue !== undefined && revenue > 0 && (
              <div>
                <span className="text-muted-foreground">{t("revenue")}: </span>
                <span className="font-medium tabular-nums">
                  {formatMoney(revenue, locale)}
                </span>
              </div>
            )}
          </div>
        </Row>
      )}
    </Card>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[140px_1fr] gap-3 items-start">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5 pt-1">
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function CompanyChip({
  name,
  logoPath,
}: {
  name: string;
  logoPath?: string | null;
}) {
  const logo = logoPath ? `https://image.tmdb.org/t/p/w92${logoPath}` : null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary/60 text-xs">
      {logo && (
        <span className="relative w-6 h-4 shrink-0 bg-white/10 rounded">
          <Image
            src={logo}
            alt={name}
            fill
            sizes="24px"
            className="object-contain"
            unoptimized
          />
        </span>
      )}
      <span>{name}</span>
    </span>
  );
}
