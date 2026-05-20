import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ThemedToaster } from "@/components/ThemedToaster";
import { Providers } from "@/app/providers";
import { routing } from "@/i18n/routing";

// Genera las rutas estáticas para cada locale (mejora SSG y permite que
// Next sepa cuáles son válidos).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Habilita el static rendering en server components que usan getTranslations
  setRequestLocale(locale);

  return (
    <NextIntlClientProvider>
      <Providers>
        <Header />
        {children}
        <Footer />
        <ThemedToaster />
      </Providers>
    </NextIntlClientProvider>
  );
}
