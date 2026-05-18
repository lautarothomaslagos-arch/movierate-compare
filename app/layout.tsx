import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ThemedToaster } from "@/components/ThemedToaster";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MovieRate Compare",
  description: "Compará ratings de películas en IMDb, Rotten Tomatoes, Metacritic, TMDB, Letterboxd y Filmaffinity en un solo lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning porque next-themes setea la clase del theme
    // (dark/light) en el cliente y eso causaría mismatch sin esto.
    <html
      lang="es-AR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <Header />
          {children}
          <Footer />
          <ThemedToaster />
        </Providers>
      </body>
    </html>
  );
}
