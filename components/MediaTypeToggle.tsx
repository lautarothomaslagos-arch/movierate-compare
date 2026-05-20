"use client";

import { Film, Tv } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type MediaType = "movie" | "tv";

const OPTIONS: Array<{
  value: MediaType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "movie", label: "Películas", icon: Film },
  { value: "tv", label: "Series", icon: Tv },
];

// Toggle entre películas y series. Pasale el path base (sin querystring)
// — el toggle agrega/quita ?type=tv según corresponde.
export function MediaTypeToggle({
  basePath,
  active,
}: {
  basePath: string;
  active: MediaType;
}) {
  return (
    <div
      role="tablist"
      aria-label="Tipo de contenido"
      className="inline-flex items-center gap-1 p-1 rounded-md border bg-secondary/40"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const isActive = value === active;
        const href = value === "movie" ? basePath : `${basePath}?type=tv`;
        return (
          <Link
            key={value}
            href={href}
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
            {label}
          </Link>
        );
      })}
    </div>
  );
}
