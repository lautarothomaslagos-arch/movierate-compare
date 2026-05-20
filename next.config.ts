import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Apunta a nuestro archivo de config server-side de i18n.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
