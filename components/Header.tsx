import { Bookmark, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { BrandStar } from "@/components/BrandStar";
import { LoginButton } from "@/components/LoginButton";
import { InstallAppButton } from "@/components/InstallAppButton";
import { LocaleToggle } from "@/components/LocaleToggle";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { SearchModalButton } from "@/components/SearchModalButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu, type UserInfo } from "@/components/UserMenu";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

// Server Component — chequea sesión y renderiza el control apropiado.
// Se incluye en app/[locale]/layout.tsx así aparece en todas las páginas.
export async function Header() {
  const t = await getTranslations("header");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userInfo: UserInfo | null = user
    ? {
        email: user.email ?? null,
        name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
        avatar_url:
          (user.user_metadata?.avatar_url as string | undefined) ??
          (user.user_metadata?.picture as string | undefined) ??
          null,
      }
    : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-3 sm:px-6 h-14 gap-2">
        <div className="flex items-center gap-1 sm:gap-4 min-w-0">
          <Link
            href="/"
            className="inline-flex items-center gap-2 shrink-0"
            aria-label={`${t("title")} ${t("subtitle")}`}
          >
            <BrandStar size={22} className="text-foreground" />
            {/* Lockup oficial: "MovieRate" italic serif + "Compare" sans
                (muted) + "." en brass. Mobile oculta "Compare" pero mantiene
                el dot brass para conservar la firma de marca. */}
            <span className="inline-flex items-baseline gap-1.5 leading-none">
              <span className="font-serif italic text-base sm:text-lg">
                {t("title")}
              </span>
              <span className="hidden sm:inline text-sm sm:text-base text-muted-foreground">
                {t("subtitle")}
              </span>
              <span className="text-primary -ml-1 text-base sm:text-lg leading-none">
                .
              </span>
            </span>
          </Link>
          {/* Links en desktop */}
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link
              href="/top"
              className="px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors inline-flex items-center gap-1"
            >
              <Trophy className="size-3.5" />
              {t("top")}
            </Link>
            <Link
              href="/generos"
              className="px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {t("genres")}
            </Link>
            <Link
              href="/watchlist"
              className="px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors inline-flex items-center gap-1"
            >
              <Bookmark className="size-3.5" />
              {t("watchlist")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1">
          {/* Botón de búsqueda — siempre visible. Atajo Cmd/Ctrl+K. */}
          <SearchModalButton />
          {/* Mobile: hamburguesa con navegación + idioma + tema integrados */}
          <div className="sm:hidden">
            <MobileNavMenu />
          </div>
          {/* Desktop only: idioma, tema, install button visibles directos */}
          <div className="hidden sm:flex items-center gap-1">
            <InstallAppButton />
            <LocaleToggle />
            <ThemeToggle />
          </div>
          {/* Avatar / login button: en ambos breakpoints */}
          {userInfo ? <UserMenu user={userInfo} /> : <LoginButton />}
        </div>
      </div>
    </header>
  );
}
