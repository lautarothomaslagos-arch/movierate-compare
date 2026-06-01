"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Botón con lupa que abre un modal con el SearchBar — Fase pulido.
// Permite buscar desde cualquier página sin tener que volver al home.
// Shortcut: Cmd/Ctrl+K abre el modal directamente.
export function SearchModalButton() {
  const t = useTranslations("search");
  const [open, setOpen] = useState(false);

  // Cmd+K / Ctrl+K para abrir desde teclado
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-md"
          aria-label={t("ariaLabel")}
        >
          <Search className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 top-[20%] translate-y-0 max-h-[80vh] flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="font-serif italic font-normal text-xl">
            {t("ariaLabel")}
          </DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-4 flex-1 min-h-0">
          {/* Reutilizamos el SearchBar; al hacer click en un resultado el
              router navega — el Dialog se queda abierto, así que cerramos
              en el efecto de navegación a través de onOpenChange. */}
          <SearchBar onNavigate={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
