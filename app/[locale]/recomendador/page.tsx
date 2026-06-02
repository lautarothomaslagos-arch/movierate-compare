import { setRequestLocale } from "next-intl/server";
import Link from "next/link";

import { BrandStar } from "@/components/BrandStar";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale: _ } = await params;
  void _;
  return {
    title: "Recomendador IA — MovieRate Compare",
    description: "El recomendador IA está pausado temporalmente.",
    robots: { index: false, follow: false },
  };
}

// Página placeholder mientras el recomendador IA está pausado por cupo
// agotado en Google Gemini. El código del IA y el endpoint siguen vivos —
// solo escondemos la UI hasta habilitar billing.
//
// Si alguien llega acá por un bookmark o link viejo, ve un mensaje
// editorial claro y un CTA al recomendador "a mano" por géneros.
export default async function RecomendadorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center max-w-2xl mx-auto w-full">
      <div className="text-foreground/80 mb-6">
        <BrandStar size={72} fillPct={0.18} />
      </div>
      <p className="text-xs font-mono uppercase tracking-[0.22em] text-muted-foreground mb-3">
        En pausa
      </p>
      <h1 className="font-serif italic font-normal text-3xl sm:text-4xl leading-tight text-balance">
        El recomendador IA descansa.
      </h1>
      <p className="text-sm sm:text-base text-muted-foreground mt-4 max-w-md mx-auto leading-relaxed">
        Lo guardamos un tiempo mientras ajustamos el flujo. La estrella
        sigue brillando: andá a explorar por géneros, mirá el Top, o
        buscá algo puntual.
      </p>
      <div className="mt-7 flex flex-wrap gap-2 justify-center">
        <Button asChild>
          <Link href="/generos">Explorar géneros</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/top">Ver el Top</Link>
        </Button>
      </div>
    </main>
  );
}
