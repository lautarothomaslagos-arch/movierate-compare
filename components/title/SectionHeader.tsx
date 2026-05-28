import { cn } from "@/lib/utils";

// Header de sección consistente — Fase G.1.5.
// Eyebrow opcional en Geist Mono uppercase + h2 en Instrument Serif italic.
// Reemplaza el patrón anterior `<h2 className="text-lg font-semibold">` que
// chocaba con el Billboard del título (serif italic).
//
// Uso:
//   <SectionHeader title={t("movie.cast")} kicker="elenco" />
//   <SectionHeader title="Comparar" subtitle="Pelis y series, lado a lado." />
export function SectionHeader({
  title,
  kicker,
  subtitle,
  align = "left",
  size = "md",
  as = "h2",
  className,
}: {
  title: string;
  // Texto pequeño en mono uppercase arriba del título
  kicker?: string;
  // Línea bajo el título en muted-fg
  subtitle?: string;
  align?: "left" | "center";
  // md = h2 de sección (default), lg = h1 de página, sm = sub-secciones
  size?: "sm" | "md" | "lg";
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  const Tag = as;
  const sizeClass =
    size === "lg"
      ? "text-3xl sm:text-4xl md:text-5xl leading-[0.95]"
      : size === "md"
        ? "text-2xl sm:text-3xl leading-tight"
        : "text-xl sm:text-2xl leading-tight";

  return (
    <header
      className={cn(
        "mb-3 sm:mb-4",
        align === "center" && "text-center",
        className
      )}
    >
      {kicker && (
        <p
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground",
            size === "lg" ? "mb-2" : "mb-1.5"
          )}
        >
          {kicker}
        </p>
      )}
      <Tag
        className={cn(
          "font-serif italic font-normal tracking-tight text-balance",
          sizeClass
        )}
      >
        {title}
      </Tag>
      {subtitle && (
        <p className="mt-2 text-sm text-muted-foreground max-w-prose">
          {subtitle}
        </p>
      )}
    </header>
  );
}
