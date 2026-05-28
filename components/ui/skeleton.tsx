import { cn } from "@/lib/utils";

// Fase G.1 — Skeleton con shimmer warm.
// La clase `skeleton-warm` (definida en globals.css) usa el primary brass
// de la paleta Late Night, así los placeholders coordinan con el resto de
// la app. Se mantiene rounded-md por compatibilidad con todos los usos.
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-warm rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
