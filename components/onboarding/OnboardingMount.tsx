"use client";

import { useEffect, useState } from "react";

import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";

// Decide si mostrar el tour de bienvenida. Lo muestra UNA SOLA VEZ por
// dispositivo (persiste con localStorage). Pequeño delay para no competir
// con el primer paint y dar tiempo a que el user vea la home.

const KEY = "movierate.onboarding-seen";
const DELAY_MS = 1200;

export function OnboardingMount() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(KEY) === "1") return;
    } catch {
      // private mode: localStorage no anda, no mostramos para no molestar
      return;
    }

    const t = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  function complete() {
    setOpen(false);
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // no-op
    }
  }

  if (!open) return null;
  return <OnboardingDialog open={open} onComplete={complete} />;
}
