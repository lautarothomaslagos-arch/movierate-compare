import { setRequestLocale } from "next-intl/server";

import { BrandStar } from "@/components/BrandStar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShareTop5Button } from "@/components/ShareTop5Button";
import { Link } from "@/i18n/navigation";
import { getMyReviews } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Compartir — MovieRate Compare",
};

type Props = {
  params: Promise<{ locale: string }>;
};

// Página de "templates" para stories. Por ahora 1 template ("Mi Top 5")
// + el flujo de "Compartir nota" que vive en cada peli. Esperá próximas
// versiones para más memes.
export default async function CompartirPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="px-4 sm:px-6 py-12 max-w-2xl mx-auto w-full text-center">
        <div className="text-foreground/70 mx-auto mb-6 w-fit">
          <BrandStar size={72} fillPct={0.12} />
        </div>
        <h1 className="font-serif italic font-normal text-3xl sm:text-4xl">
          Compartir tu archivo
        </h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
          Iniciá sesión para armar tarjetas de tu Top 5 y tus notas
          favoritas para stories de Instagram.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Ir al inicio</Link>
        </Button>
      </main>
    );
  }

  const reviews = await getMyReviews(100);
  const top = [...reviews].sort((a, b) => b.rating - a.rating).slice(0, 5);
  const hasEnough = top.length >= 3;

  return (
    <main className="px-4 sm:px-6 py-8 max-w-3xl mx-auto w-full">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground inline-flex items-center gap-2 mb-2">
          <span className="inline-block size-1.5 rounded-full bg-primary" />
          Tarjetas para stories
        </p>
        <h1 className="font-serif italic font-normal text-3xl sm:text-4xl leading-[0.95] tracking-tight text-balance">
          Compartí tu archivo.
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-prose">
          Generamos imágenes de tu Top 5 listas para postear. Más tarjetas
          (citas, comparaciones) en próximas versiones.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Template: Mi Top 5 */}
        <Card className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <BrandStar size={32} fillPct={0.85} />
            <div>
              <h2 className="font-serif italic font-normal text-xl leading-tight">
                Mi Top 5
              </h2>
              <p className="text-xs text-muted-foreground">
                Tus 5 notas más altas en una stories vertical (1080×1920).
              </p>
            </div>
          </div>
          {hasEnough ? (
            <ShareTop5Button />
          ) : (
            <div className="rounded-lg border border-dashed border-border/40 p-4 text-center">
              <p className="text-xs text-muted-foreground">
                Necesitás al menos 3 reviews para armar tu Top.
              </p>
              <Button asChild variant="link" size="sm" className="mt-2">
                <Link href="/mis-reviews">Ver mis reviews</Link>
              </Button>
            </div>
          )}
        </Card>

        {/* Template: Cita / próximamente */}
        <Card className="p-5 flex flex-col gap-3 border-dashed">
          <div className="flex items-center gap-3">
            <BrandStar size={32} fillPct={0.15} />
            <div>
              <h2 className="font-serif italic font-normal text-xl leading-tight">
                Cita destacada
              </h2>
              <p className="text-xs text-muted-foreground">
                Próximamente: una cita memorable + poster + tu marca.
              </p>
            </div>
          </div>
          <Button disabled variant="outline" size="sm">
            En preparación
          </Button>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground mt-8 max-w-prose leading-relaxed">
        Tip: para compartir la nota de UNA peli puntual, entrá al detalle
        y vas a ver el botón <em>Compartir como imagen</em> al lado de tu
        review guardada.
      </p>
    </main>
  );
}
