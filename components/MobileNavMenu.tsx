"use client";

import {
  Bookmark,
  Check,
  Download,
  Film,
  History,
  Languages,
  Menu,
  Moon,
  Sun,
  Trophy,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

// Hamburguesa para mobile. Centraliza navegación + idioma + tema en un solo
// menú para no atochar el header. En desktop estos controles viven separados
// (la página padre oculta este componente con sm:hidden).
export function MobileNavMenu() {
  const t = useTranslations("header");
  const tLocale = useTranslations("locale");
  const tTheme = useTranslations("theme");
  const tInstall = useTranslations("install");
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { canInstall, install } = useInstallPrompt();

  // next-themes: evitar hydration mismatch
  useEffect(() => setMounted(true), []);

  function switchLocale(locale: "es" | "en") {
    if (locale === currentLocale) return;
    startTransition(() => {
      router.replace(pathname, { locale });
    });
  }

  const current = theme === "system" ? resolvedTheme : theme;
  const isDark = current === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-md"
          aria-label={t("menu")}
        >
          <Menu className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Navegación principal */}
        <DropdownMenuItem asChild>
          <Link href="/top">
            <Trophy />
            {t("top")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/generos">
            <Film />
            {t("genres")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/watchlist">
            <Bookmark />
            {t("watchlist")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/historial">
            <History />
            {t("history")}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Idioma */}
        <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          <Languages className="inline size-3 mr-1.5" />
          {tLocale("label")}
        </DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() => switchLocale("es")}
          disabled={isPending}
        >
          <span className="text-xs font-mono uppercase opacity-60 w-6">es</span>
          {tLocale("es")}
          {currentLocale === "es" && (
            <Check className="ml-auto size-3.5 text-primary" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => switchLocale("en")}
          disabled={isPending}
        >
          <span className="text-xs font-mono uppercase opacity-60 w-6">en</span>
          {tLocale("en")}
          {currentLocale === "en" && (
            <Check className="ml-auto size-3.5 text-primary" />
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Tema */}
        <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          {tTheme("change")}
        </DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() => mounted && setTheme(isDark ? "light" : "dark")}
          disabled={!mounted}
        >
          {isDark ? (
            <>
              <Sun />
              {tTheme("toLight")}
            </>
          ) : (
            <>
              <Moon />
              {tTheme("toDark")}
            </>
          )}
        </DropdownMenuItem>

        {/* Instalar app — solo aparece si el browser soporta el prompt
            (Chrome/Edge/Android) y el user no dijo "después" antes. */}
        {canInstall && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                // void: no esperamos la promise para que el menú se cierre.
                void install();
              }}
            >
              <Download />
              {tInstall("label")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
