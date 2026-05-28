import { Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";

import { RecommenderClient } from "./RecommenderClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale: _ } = await params;
  void _;
  return {
    title: "Recomendador IA — MovieRate Compare",
    description: "Recibí recomendaciones personalizadas según tu historial.",
  };
}

export default async function RecomendadorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("recommender");

  // Chequear sesión server-side para mostrar la advertencia inicial
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLogged = !!user;

  return (
    <main className="px-4 sm:px-6 py-8 max-w-3xl mx-auto w-full">
      <header className="mb-6">
        <h1 className="font-serif italic font-normal text-3xl sm:text-4xl leading-[0.95] tracking-tight text-balance inline-flex items-baseline gap-2">
          <Sparkles className="size-6 sm:size-7 text-amber-400" />
          {t("heading")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        <p className="text-xs text-muted-foreground/80 mt-1">
          {t("disclaimer")}
        </p>
      </header>

      <RecommenderClient isLogged={isLogged} />
    </main>
  );
}
