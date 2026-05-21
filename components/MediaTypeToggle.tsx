"use client";

import { Film, Tv } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type MediaType = "movie" | "tv";

const OPTIONS: Array<{
  value: MediaType;
  labelKey: "movie" | "tv";
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "movie", labelKey: "movie", icon: Film },
  { value: "tv", labelKey: "tv", icon: Tv },
];

// Toggle entre películas y series. Acepta dos formas:
// - `basePath`: URL base (la toggle agrega/quita ?type=tv).
// - `hrefs`: URLs explícitas por tipo.
export function MediaTypeToggle(
  props: {
    active: MediaType;
  } & (
    | { basePath: string; hrefs?: never }
    | { hrefs: Record<MediaType, string>; basePath?: never }
  )
) {
  const { active } = props;
  const t = useTranslations("genres.mediaToggle");

  function computeHref(value: MediaType): string {
    if ("hrefs" in props && props.hrefs) return props.hrefs[value];
    const basePath = "basePath" in props ? props.basePath! : "/";
    return value === "movie" ? basePath : `${basePath}?type=tv`;
  }

  return (
    <div
      role="tablist"
      aria-label={t("ariaLabel")}
      className="inline-flex items-center gap-1 p-1 rounded-md border bg-secondary/40"
    >
      {OPTIONS.map(({ value, labelKey, icon: Icon }) => {
        const isActive = value === active;
        return (
          <Link
            key={value}
            href={computeHref(value)}
            role="tab"
            aria-selected={isActive}
            prefetch={false}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {t(labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
