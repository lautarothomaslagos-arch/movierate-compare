import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Instrument Serif — Fase G.1. Display + títulos editoriales + números
// del weighted average. Tiene normal+italic en 400. ~14KB woff2 con
// display: swap = sin CLS.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

// Metadata global (sobreescrita por cada page con generateMetadata)
export const metadata: Metadata = {
  metadataBase: new URL("https://movierate-compare.vercel.app"),
  title: {
    default: "MovieRate Compare",
    template: "%s · MovieRate Compare",
  },
  description:
    "Compará ratings de películas y series en IMDb, Rotten Tomatoes, Metacritic, TMDB y Letterboxd. Promediados en una sola búsqueda.",
  keywords: [
    "ratings de películas",
    "comparar películas",
    "puntajes IMDb",
    "Rotten Tomatoes",
    "Metacritic",
    "recomendador películas",
    "qué ver esta noche",
    "ratings de series",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MovieRate",
  },
  // Verificación Google Search Console — Fase H.1.
  // Seteá GOOGLE_SITE_VERIFICATION en Vercel después de registrar el
  // sitio en search.google.com/search-console (método "HTML tag").
  // Si la env var no está, Next.js no emite el tag (undefined es OK).
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  // Coincide con el theme_color del manifest.json (paleta Late Night).
  themeColor: "#241d12",
  colorScheme: "dark light",
  // viewport-fit=cover habilita que env(safe-area-inset-*) devuelva
  // valores reales en celulares con notch / barra nativa (sin esto,
  // env() devuelve 0 y la MobileActionBar queda tapada por el sistema).
  viewportFit: "cover",
};

// Root layout minimalista. El layout "real" (con providers, header, footer
// y NextIntlClientProvider) está en app/[locale]/layout.tsx.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <head>
        {/* Preconnect a TMDB images: cada página detalle/grid carga 5-10
            imágenes. Establecer la conexión TLS antes ahorra ~100-200ms al
            primer fetch. */}
        <link
          rel="preconnect"
          href="https://image.tmdb.org"
          crossOrigin="anonymous"
        />
        {/* dns-prefetch para YouTube embeds (TrailerSection). Más liviano
            que preconnect porque el trailer está abajo del fold. */}
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <RegisterServiceWorker />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
