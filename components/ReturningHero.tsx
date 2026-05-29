import { getTranslations } from "next-intl/server";

import { SearchBar } from "@/components/SearchBar";
import { Link } from "@/i18n/navigation";

// Hero compacto para usuarios que vuelven (Fase G.2).
// En lugar del backdrop gigante del HeroSection (pensado para el primer
// visitante), saludamos rápido y mostramos el buscador. El resto del fold
// queda para "Próximo en tu lista" y "Recientes" — info que el user
// recurrente quiere ver primero.
export async function ReturningHero({ name }: { name: string | null }) {
  const t = await getTranslations("home");
  const tReturning = await getTranslations("returningHero");

  // Saludo personalizado si tenemos nombre; sino, neutro.
  const greeting = name
    ? tReturning("greetingWithName", { name })
    : tReturning("greeting");

  return (
    // z-30 + isolate: que el SearchBar y su dropdown queden arriba de los
    // carruseles siguientes (Próximo en tu lista, Recientes, Trending).
    <section className="relative z-30 isolate max-w-5xl mx-auto w-full px-4 sm:px-6 pt-10 sm:pt-14 pb-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2 mb-2">
        <span className="inline-block size-1.5 rounded-full bg-primary" />
        {tReturning("eyebrow")}
      </p>
      <h1 className="font-serif italic font-normal text-3xl sm:text-4xl md:text-5xl leading-[0.95] tracking-tight text-balance">
        {greeting}
        <span className="text-primary not-italic">.</span>
      </h1>
      <p className="text-sm text-muted-foreground mt-3 max-w-prose">
        {tReturning("subtitle")}
      </p>

      <div className="mt-6 max-w-xl">
        <SearchBar />
        <p className="text-[11px] text-muted-foreground mt-2">
          {t("searchHint")}
        </p>
      </div>
    </section>
  );
}
