"use client";

import { LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("auth");

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
        toast.error(t("signInError", { error: error.message }));
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      toast.error(t("unexpectedError"));
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
      {loading ? t("signingIn") : t("signIn")}
    </Button>
  );
}
