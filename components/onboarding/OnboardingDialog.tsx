"use client";

import { Bookmark, Search, Sparkles } from "lucide-react";
import { useState } from "react";

import { BrandStar } from "@/components/BrandStar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Tour de bienvenida — primera visita. 4 pasos editoriales con la estrella
// de marca en cada uno y "skip" disponible siempre. Self-contained, sin
// dependencias de tour libraries (driver.js etc.). El estado de "ya lo vi"
// lo persiste OnboardingMount via localStorage.

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
}

type Step = {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    icon: <BrandStar size={56} fillPct={0.74} />,
    eyebrow: "Hola.",
    title: "Tu nota, encima de todo.",
    body: "Compará puntajes de IMDb, Rotten Tomatoes, Metacritic, TMDB y Letterboxd en una sola búsqueda. Y ponele la tuya encima.",
  },
  {
    icon: <Search className="size-12 text-primary" />,
    eyebrow: "Buscá",
    title: "Lupa siempre a mano.",
    body: "Tocá la lupa arriba a la derecha (o usá Cmd+K en compu) para encontrar pelis, series o actores desde cualquier página.",
  },
  {
    icon: <Sparkles className="size-12 text-primary" />,
    eyebrow: "Recomendador",
    title: "¿No sabés qué ver?",
    body: "Contale a la IA tu mood, qué tenés ganas de sentir, qué te gustó la última vez. Te tira 5 opciones pensadas, no genéricas.",
  },
  {
    icon: <Bookmark className="size-12 text-primary" />,
    eyebrow: "Tu lista",
    title: "Guardá. Calificá.",
    body: "Anotá lo que querés ver. Calificá lo que ya viste. Todo queda en tu perfil, privado. Listo para retomar cuando vuelvas.",
  },
];

export function OnboardingDialog({ open, onComplete }: OnboardingDialogProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function next() {
    if (isLast) {
      onComplete();
      return;
    }
    setStep((s) => s + 1);
  }

  function skip() {
    onComplete();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && skip()}>
      <DialogContent
        className={
          "sm:max-w-lg p-0 gap-0 " +
          // Mobile: bottom sheet. Desktop: centered modal.
          "max-sm:left-0 max-sm:right-0 max-sm:bottom-0 max-sm:top-auto " +
          "max-sm:translate-x-0 max-sm:translate-y-0 " +
          "max-sm:w-full max-sm:max-w-full " +
          "max-sm:rounded-t-2xl max-sm:rounded-b-none " +
          "max-sm:border-x-0 max-sm:border-b-0 max-sm:border-t"
        }
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Mobile handle */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Contenido del paso */}
        <DialogHeader className="px-6 pt-4 pb-2 text-left">
          <div className="flex justify-center mb-4">{current.icon}</div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground text-center">
            {current.eyebrow}
          </p>
          <DialogTitle className="font-serif italic font-normal text-2xl sm:text-3xl leading-tight text-center mt-2">
            {current.title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-4 text-sm text-muted-foreground text-center max-w-md mx-auto leading-relaxed">
          {current.body}
        </div>

        {/* Pagination dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={
                "size-1.5 rounded-full transition-colors " +
                (i === step ? "bg-primary" : "bg-muted-foreground/30")
              }
            />
          ))}
        </div>

        {/* Acciones */}
        <div className="flex gap-2 px-6 pb-5">
          {!isLast && (
            <Button onClick={skip} variant="ghost" className="flex-1">
              Saltar
            </Button>
          )}
          <Button onClick={next} className={isLast ? "flex-1" : "flex-1"}>
            {isLast ? "Empezar a ver pelis" : "Siguiente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
