import { Tv } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function SerieNotFound() {
  const t = await getTranslations();
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Tv className="size-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold">{t("tv.notFoundTitle")}</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        {t("tv.notFoundBody")}
      </p>
      <Button asChild className="mt-6">
        <Link href="/">{t("common.backToSearch")}</Link>
      </Button>
    </main>
  );
}
