import { BrandStarFillRise } from "@/components/BrandStarFillRise";

// Loading UI mostrada por Next durante streaming SSR / data fetching.
// Lo más cercano a un "splash" sin meterse con el splash nativo de Chrome
// (que lo arma desde manifest icons + background_color, no es animable).
//
// Diseño: estrella vacía → fill rise hasta 74% en 1.3s, sobre fondo
// background. Coherente con "Estrella-nota". Si el user pidió
// reduced-motion, la estrella aparece quieta en 74%.
export default function LocaleLoading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="text-foreground">
        <BrandStarFillRise size={88} duration={1300} />
      </div>
      <p
        aria-live="polite"
        className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
      >
        Cargando
      </p>
    </main>
  );
}
