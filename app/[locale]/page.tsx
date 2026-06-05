import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { AuthErrorToast } from "@/components/AuthErrorToast";
import { ContinueWhereYouLeftSection } from "@/components/ContinueWhereYouLeftSection";
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
import {
  TrendingSection,
  TrendingSectionSkeleton,
} from "@/components/TrendingSection";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tReturning = await getTranslations("returningHero");

  // Branching server-side: el usuario logueado tiene la peli del día como
  // hero del fold (con saludo personalizado en el eyebrow). El anónimo
  // sigue viendo el HeroSection editorial gigante con pitch + buscador.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    null;

  const greeting = user
    ? userName
      ? tReturning("greetingShortWithName", { name: userName })
      : tReturning("greetingShort")
    : undefined;

  return (
    <main className="flex flex-1 flex-col">
      {/* Suspense porque useSearchParams es client-only */}
      <Suspense fallback={null}>
        <AuthErrorToast />
      </Suspense>

      {/* Tour de bienvenida (solo primera visita, persistido en localStorage) */}
      <OnboardingMount />

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-10 pb-10 sm:pb-12 space-y-10">
        {/* Fold inicial:
            - Logueado → Peli del día como hero (saludo personalizado en eyebrow).
            - Anónimo → HeroSection original con pitch + backdrop.
        */}
        {user ? (
          <Suspense fallback={<FeaturedDailySkeleton />}>
            <FeaturedDailySection greeting={greeting} />
          </Suspense>
        ) : (
          <Suspense fallback={<HeroSectionSkeleton />}>
            <HeroSection />
          </Suspense>
        )}

        {/* Continuá donde dejaste: tabs unificadas (próximos + recientes).
            Reemplaza las viejas secciones separadas UpcomingSection +
            RecentlyVisitedSection. Solo renderiza si hay algo que mostrar. */}
        <Suspense fallback={null}>
          <ContinueWhereYouLeftSection />
        </Suspense>

        {/* Peli del día — solo para anónimos (logueados la ven arriba como hero) */}
        {!user && (
          <Suspense fallback={<FeaturedDailySkeleton />}>
            <FeaturedDailySection />
          </Suspense>
        )}

        {/* Tendencias del día (compactado: 8 items, sin subtítulo) */}
        <section>
          <h2 className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight tracking-tight text-balance mb-3">
            {t("trendingHeading")}
          </h2>
          <Suspense fallback={<TrendingSectionSkeleton />}>
            <TrendingSection limit={8} />
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
