import { History } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { RecentlyVisitedLocal } from "@/components/RecentlyVisitedLocal";
import { Link } from "@/i18n/navigation";
import { getHistoryFromDb } from "@/lib/history";
import { createClient } from "@/lib/supabase/server";

import { RecentlyVisitedGrid } from "@/components/RecentlyVisitedGrid";

// Server Component. Si el user está logueado, lee DB y renderiza la grilla.
// Si NO está logueado, renderiza el componente cliente que lee localStorage.
// En cualquier caso, si no hay items, no renderiza la sección.
export async function RecentlyVisitedSection({ limit = 6 }: { limit?: number }) {
  const t = await getTranslations("history");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <RecentlyVisitedLocal limit={limit} heading={t("recentlyVisited")} />
    );
  }

  const items = await getHistoryFromDb(limit);
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight inline-flex items-center gap-2">
          <History className="size-5 text-muted-foreground" />
          {t("recentlyVisited")}
        </h2>
        <Link
          href="/historial"
          prefetch={false}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          →
        </Link>
      </div>
      <RecentlyVisitedGrid items={items} />
    </section>
  );
}
