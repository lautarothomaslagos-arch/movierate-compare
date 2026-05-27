"use client";

import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type Actor = {
  id: number;
  name: string;
  character?: string | null;
  profile_path?: string | null;
};

// Lazy import del dialog pesado. Solo se descarga el JS de Radix Dialog +
// Input + grid de actores cuando el user hace click en el botón por primera
// vez. ssr: false porque el modal no necesita HTML server-side.
const FullCastDialog = dynamic(() => import("./FullCastDialog"), {
  ssr: false,
  loading: () => null,
});

// Trigger liviano: solo botón. Al primer click monta el dialog (que viene
// por next/dynamic) y a partir de ahí queda residente.
export function FullCastModal({ cast }: { cast: Actor[] }) {
  const t = useTranslations("fullCast");
  const [open, setOpen] = useState(false);
  // Flag para evitar montar el dialog antes del primer click (ahorra el
  // chunk JS hasta que realmente se necesita).
  const [mounted, setMounted] = useState(false);

  if (cast.length === 0) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
      >
        <Users className="size-4" />
        {t("openBtn")} ({cast.length})
      </Button>

      {mounted && (
        <FullCastDialog cast={cast} open={open} onOpenChange={setOpen} />
      )}
    </>
  );
}
