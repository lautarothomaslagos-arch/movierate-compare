import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { AuthErrorToast } from "@/components/AuthErrorToast";
import {
  FeaturedDailySection,
  FeaturedDailySkeleton,
} from "@/components/FeaturedDailySection";
import {
  FeaturedGenresSection,
  FeaturedGenresSkeleton,
} from "@/components/FeaturedGenresSection";
import { HeroSection, HeroSectionSkeleton } from "@/components/HeroSection";
import { OnboardingMount } from "@/components/onboarding/OnboardingMount";
import { RecentlyVisitedSection } from "@/components/RecentlyVisitedSection";
import { ReturningHero } from "@/components/ReturningHero";
import {
  TrendingSection,
  TrendingSectionSkeleton,
} from "@/components/TrendingSection";
import { UpcomingSection } from "@/components/UpcomingSection";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  // Branching server-side (Fase G.2): para usuarios logueados, el hero
  // gigante con backdrop ocupa fold con info que ya conocen. Reemplazado
  // por ReturningHero compacto. El user anónimo sigue viendo el hero
  // editorial completo.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    null;

  return (
    <main className="flex flex-1 flex-col">
      {/* Suspense porque useSearchParams es client-only */}
      <Suspense fallback={null}>
        <AuthErrorToast />
      </Suspense>

      {/* Tour de bienvenida (solo primera visita, persistido en localStorage) */}
      <OnboardingMount />

      {/* Hero condicional */}
      {user ? (
        <ReturningHero name={userName} />
      ) : (
        <Suspense fallback={<HeroSectionSkeleton />}>
          <HeroSection />
        </Suspense>
      )}

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 space-y-12">
        {/* Próximo en tu lista — solo logueado con series próximas */}
        <Suspense fallback={null}>
          <UpcomingSection />
        </Suspense>

        {/* Recientes — solo si hay historial DB o localStorage */}
        <Suspense fallback={null}>
          <RecentlyVisitedSection limit={6} />
        </Suspense>

        {/* Peli del día — sección editorial con pick determinístico
            día/año, sobre el fold para anónimos, hace identidad. */}
        <Suspense fallback={<FeaturedDailySkeleton />}>
          <FeaturedDailySection />
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
