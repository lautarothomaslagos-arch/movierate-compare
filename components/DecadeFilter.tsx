import { Link } from "@/i18n/navigation";
import type { DecadeKey } from "@/lib/decades";
import { DECADE_KEYS } from "@/lib/decades";
import { cn } from "@/lib/utils";

// Pills horizontales scrolleables con la década activa destacada.
// Cada link arma el href preservando type y reseteando page=1.
export function DecadeFilter({
  active,
  buildHref,
  labels,
}: {
  active: DecadeKey;
  // Función que dado un decade key devuelve el href para esa pill.
  buildHref: (decade: DecadeKey) => string;
  labels: Record<DecadeKey, string>;
}) {
  return (
    <div
      className="-mx-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Decade filter"
    >
      <div className="flex gap-1.5 px-1 py-1 min-w-max">
        {DECADE_KEYS.map((key) => {
          const isActive = key === active;
          return (
            <Link
              key={key}
              href={buildHref(key)}
              prefetch={false}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {labels[key]}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
