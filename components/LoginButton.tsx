"use client";

import { LogIn } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      const supabase = createClient();
      const next = window.location.pathname + window.location.search;
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        toast.error(`No se pudo iniciar sesión: ${error.message}`);
        setLoading(false);
      }
      // Si todo va bien, Supabase redirige al usuario a Google y después
      // a /auth/callback. No tocamos setLoading(false) porque ya navegamos.
    } catch (err) {
      console.error(err);
      toast.error("Error inesperado en el login.");
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogin}
      disabled={loading}
    >
      <LogIn className="size-4" />
      {loading ? "Conectando..." : "Iniciar sesión"}
    </Button>
  );
}
