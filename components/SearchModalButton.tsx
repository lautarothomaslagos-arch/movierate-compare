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
      {/* Mobile: fullscreen desde arriba para que el teclado virtual no
          tape los resultados (max-h-[80vh] no servía — el teclado ocupa
          ~50% inferior). 100dvh = dynamic viewport height, se adapta
          cuando el teclado abre/cierra en browsers modernos.
          Desktop (sm+): mantenemos el modal centrado tipo command palette. */}
      <DialogContent
        className={
          "inset-0 w-full max-w-full h-[100dvh] max-h-[100dvh] translate-x-0 translate-y-0 rounded-none border-0 " +
          "sm:inset-auto sm:top-[20%] sm:left-1/2 sm:-translate-x-1/2 sm:w-auto sm:max-w-2xl sm:h-auto sm:max-h-[80vh] sm:rounded-lg sm:border " +
          "p-0 gap-0 flex flex-col"
        }
      >
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
          <DialogTitle className="font-serif italic font-normal text-xl">
            {t("ariaLabel")}
          </DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-4 flex-1 min-h-0 overflow-y-auto">
          {/* Reutilizamos el SearchBar; al hacer click en un resultado el
              router navega — el Dialog se queda abierto, así que cerramos
              en el efecto de navegación a través de onOpenChange. */}
          <SearchBar onNavigate={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
