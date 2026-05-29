import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

import { SearchBar } from "@/components/SearchBar";
import { backdropUrl, getTrending } from "@/lib/tmdb";

// Hero principal de la home. Trae un trending random del día y usa su
// backdrop como fondo. Si TMDB falla, fallback a gradiente sólido.
export async function HeroSection() {
  const t = await getTranslations("home");
  let backdropSrc: string | null = null;
  let highlight: { title: string; mediaType: "movie" | "tv" } | null = null;

  try {
    const trending = await getTrending("day");
    const candidates = trending.results.filter(
      (r): r is Extract<typeof r, { media_type: "movie" | "tv" }> =>
        (r.media_type === "movie" || r.media_type === "tv") &&
        !!r.backdrop_path
    );
    if (candidates.length > 0) {
      const top = candidates.slice(0, 5);
      const pick = top[Math.floor(Math.random() * top.length)];
      backdropSrc = backdropUrl(pick.backdrop_path, "w1280");
      highlight = {
        title: pick.media_type === "movie" ? pick.title : pick.name,
        mediaType: pick.media_type,
      };
    }
  } catch (err) {
    console.warn("[HeroSection] failed to load trending:", err);
  }

  return (
    // OJO: NO usar overflow-hidden en el <section>. El SearchBar tiene un
    // dropdown absoluto que sobresale debajo del hero y si recortamos acá
    // queda tapado por la sección de Recientes. El backdrop tiene su propio
    // overflow-hidden en su contenedor (que sí lo necesita).
    // z-30 + isolate fuerzan a TODO el hero a estar arriba del trending y
    // demás secciones siguientes — necesario para que el dropdown del
    // SearchBar no quede tapado por los posters.
    <section className="relative z-30 isolate border-b border-border/40">
      {backdropSrc ? (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <Image
            src={backdropSrc}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/20 to-background/80" />
        </div>
      ) : (
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background" />
      )}

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24 md:py-32 flex flex-col items-center text-center">
        {highlight && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/60 backdrop-blur text-xs font-medium text-muted-foreground mb-4 animate-fade-in">
            <Sparkles className="size-3 text-primary" />
            {t("trendingChip", { title: highlight.title })}
          </div>
        )}

        <h1 className="font-serif italic font-normal text-[clamp(2.75rem,5vw+1rem,5rem)] leading-[0.95] tracking-tight text-balance animate-fade-in-up">
          {t("title")}{" "}
          <span className="text-muted-foreground not-italic font-sans">{t("titleSecondary")}</span>
          <span className="text-primary not-italic">.</span>
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-md mt-3 animate-fade-in-up animate-delay-100">
          {t("tagline")}
        </p>

        <div className="w-full max-w-xl mt-8 animate-fade-in-up animate-delay-200">
          <SearchBar />
          <p className="text-xs text-muted-foreground mt-2">
            {t("searchHint")}
          </p>
        </div>
      </div>
    </section>
  );
}

export function HeroSectionSkeleton() {
  return (
    <section className="relative overflow-hidden border-b border-border/40">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24 md:py-32 text-center">
        <div className="h-14 w-3/4 mx-auto bg-muted/40 rounded animate-pulse" />
        <div className="h-4 w-2/3 mx-auto bg-muted/30 rounded animate-pulse mt-4" />
        <div className="h-12 w-full max-w-xl mx-auto bg-muted/40 rounded-md animate-pulse mt-8" />
      </div>
    </section>
  );
}
