import { getTranslations } from "next-intl/server";

import { ContinueTabs } from "@/components/ContinueTabs";
import { RecentlyVisitedGrid } from "@/components/RecentlyVisitedGrid";
import { RecentlyVisitedLocal } from "@/components/RecentlyVisitedLocal";
import { UpcomingCarousel } from "@/components/UpcomingCarousel";
import { getHistoryFromDb } from "@/lib/history";
import { createClient } from "@/lib/supabase/server";
import { getUpcomingFromWatchlist } from "@/lib/upcoming";

// "Continuá donde dejaste" — unificación de las viejas secciones separadas
// UpcomingSection + RecentlyVisitedSection. Reduce scroll en la home y
// agrupa contenido del mismo "modo" (lo que ya estás viendo / vas a ver).
//
// Casos:
//   - Logueado con próximos + historial → 2 tabs ("Próximos" / "Recientes").
//   - Logueado con solo uno → 1 sección sin tabs.
//   - Logueado sin nada → null.
//   - Anónimo → solo "Recientes" via localStorage (cliente).

export async function ContinueWhereYouLeftSection() {
  const tUpcoming = await getTranslations("upcoming");
  const tHistory = await getTranslations("history");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Anónimo: solo localStorage. Mantenemos el flow original.
  if (!user) {
    return (
      <RecentlyVisitedLocal
        limit={8}
        heading={tHistory("recentlyVisited")}
      />
    );
  }

  // Logueado: fetch en paralelo
  const [upcomingItems, historyItems] = await Promise.all([
    getUpcomingFromWatchlist(14),
    getHistoryFromDb(8),
  ]);

  if (upcomingItems.length === 0 && historyItems.length === 0) {
    return null;
  }

  return (
    <ContinueTabs
      tabs={[
        {
          key: "upcoming",
          label: tUpcoming("homeHeading"),
          count: upcomingItems.length,
          content: (
            <UpcomingCarousel
              items={upcomingItems}
              labels={{
                today: tUpcoming("today"),
                tomorrow: tUpcoming("tomorrow"),
                inDays: (n: number) => tUpcoming("inDays", { n }),
              }}
            />
          ),
        },
        {
          key: "recent",
          label: tHistory("recentlyVisited"),
          count: historyItems.length,
          content: <RecentlyVisitedGrid items={historyItems} />,
        },
      ]}
    />
  );
}
