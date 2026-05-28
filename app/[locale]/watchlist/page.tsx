import { Bookmark, Film } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";

import { LocalWatchlist } from "@/app/[locale]/watchlist/LocalWatchlist";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWatchlistFromDb } from "@/lib/watchlist";

export const metadata = {
  title: "Mi lista — MovieRate Compare",
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function WatchlistPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("watchlist");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
        <h1 className="font-serif italic font-normal text-3xl sm:text-4xl leading-[0.95] tracking-tight text-balance mb-6">{t("heading")}</h1>
        <LocalWatchlist />
      </main>
    );
  }

  const items = await getWatchlistFromDb(100);

  return (
    <main className="px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
      <header className="mb-6">
        <h1 className="font-serif italic font-normal text-3xl sm:text-4xl leading-[0.95] tracking-tight text-balance">{t("heading")}</h1>
        {items.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {items.length === 1
              ? t("countOne", { count: items.length })
              : t("countOther", { count: items.length })}
          </p>
        )}
      </header>

      {items.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Bookmark className="size-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-serif italic font-normal text-xl sm:text-2xl">{t("empty")}</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {t("emptyBody")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {items.map((item) => {
            const href =
              item.media_type === "tv"
                ? `/serie/${item.tmdb_id}`
                : `/movie/${item.tmdb_id}`;
            return (
              <Link
                key={`${item.media_type}-${item.tmdb_id}`}
                href={href}
                className="group block"
                prefetch={false}
              >
                <div className="relative aspect-[2/3] bg-muted rounded-md overflow-hidden ring-1 ring-border transition-all group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-primary/60">
                  {item.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                      alt={`Poster ${item.title}`}
                      fill
                      sizes="(min-width: 768px) 192px, (min-width: 640px) 160px, 30vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Film className="size-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="mt-1.5 text-xs font-medium truncate">
                  {item.title}
                </div>
                {item.year !== null && (
                  <div className="text-xs text-muted-foreground">
                    {item.year}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
