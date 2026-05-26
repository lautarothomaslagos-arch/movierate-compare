"use client";

import { Bookmark, Film, History, Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";

// Hamburguesa para mobile que agrupa Géneros + Mi lista + Historial.
// En desktop estos links viven separados en el header — este componente
// no se renderiza (la página padre lo oculta con sm:hidden).
export function MobileNavMenu() {
  const t = useTranslations("header");

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
      <DropdownMenuContent align="end" className="w-48">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
