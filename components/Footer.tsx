import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("footer");
  return (
    <footer className="border-t border-border/40 bg-background/50 mt-auto">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 text-xs text-muted-foreground">
        <p>{t("disclaimer")}</p>
      </div>
    </footer>
  );
}
