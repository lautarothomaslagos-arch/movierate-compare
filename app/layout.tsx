import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata global (sobreescrita por cada page con generateMetadata)
export const metadata: Metadata = {
  title: "MovieRate Compare",
  description: "Compará ratings de películas y series en IMDb, Rotten Tomatoes, Metacritic, TMDB, Letterboxd y Filmaffinity.",
};

// Root layout minimalista. El layout "real" (con providers, header, footer
// y NextIntlClientProvider) está en app/[locale]/layout.tsx — necesita
// vivir adentro del segmento [locale] para que next-intl pueda leer el
// locale del request.
//
// Acá solo configuramos el <html> y las fuentes, comunes a todas las rutas
// (incluyendo /api y /auth/callback que están fuera del [locale]).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
