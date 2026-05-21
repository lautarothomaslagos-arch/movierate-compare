"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";

const LOCALES = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
] as const;

export function LocaleToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const t = useTranslations("locale");
  const [isPending, startTransition] = useTransition();

  function switchLocale(locale: "es" | "en") {
    if (locale === currentLocale) return;
    startTransition(() => {
      // next-intl's router.replace acepta locale como opción y conserva el path
      router.replace(pathname, { locale });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t("label")}
          disabled={isPending}
        >
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => switchLocale(l.code as "es" | "en")}
            className={l.code === currentLocale ? "font-semibold" : ""}
          >
            <span className="text-xs font-mono uppercase opacity-60 w-6">
              {l.code}
            </span>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
