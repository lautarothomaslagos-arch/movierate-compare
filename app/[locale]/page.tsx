import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { AuthErrorToast } from "@/components/AuthErrorToast";
import {
  FeaturedGenresSection,
  FeaturedGenresSkeleton,
} from "@/components/FeaturedGenresSection";
import { HeroSection, HeroSectionSkeleton } from "@/components/HeroSection";
import { RecentlyVisitedSection } from "@/components/RecentlyVisitedSection";
import {
  TrendingSection,
  TrendingSectionSkeleton,
} from "@/components/TrendingSection";
import { UpcomingSection } from "@/components/UpcomingSection";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <main className="flex flex-1 flex-col">
      {/* Suspense porque useSearchParams es client-only */}
      <Suspense fallback={null}>
        <AuthErrorToast />
      </Suspense>

      {/* Hero con backdrop dinámico + buscador */}
      <Suspense fallback={<HeroSectionSkeleton />}>
        <HeroSection />
      </Suspense>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14 space-y-12">
        {/* Próximo en tu lista — Fase F.4. Solo se muestra si el user
            está logueado y tiene series en watchlist con episodios
            próximos. Si no, devuelve null. */}
        <Suspense fallback={null}>
          <UpcomingSection />
        </Suspense>

        {/* Recientes — solo si el user tiene historial (DB o localStorage).
            Si no, el componente devuelve null y la sección no aparece. */}
        <Suspense fallback={null}>
          <RecentlyVisitedSection limit={6} />
        </Suspense>

        {/* Tendencias del día */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight tracking-tight text-balance">
              {t("trendingHeading")}
            </h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {t("trendingSubtitle")}
            </p>
          </div>
          <Suspense fallback={<TrendingSectionSkeleton />}>
            <TrendingSection limit={12} />
          </Suspense>
        </section>

        {/* Géneros destacados */}
        <section>
          <h2 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight tracking-tight text-balance mb-3">
            {t("featuredGenresHeading")}
          </h2>
          <Suspense fallback={<FeaturedGenresSkeleton />}>
            <FeaturedGenresSection />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
