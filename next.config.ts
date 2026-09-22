import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Adresses : la Pitchothèque à /pitchotheque, une fiche projet à
  // /projet/<id>, sa création à /projet. Les anciennes adresses (/projets,
  // /projets/<id>, /deposer) y renvoient : les liens déjà partagés tiennent.
  // Le service worker ne doit jamais être gardé en cache : chaque
  // nouvelle version du site doit pouvoir le remplacer aussitôt.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/projets", destination: "/pitchotheque", permanent: true },
      { source: "/projets/:path*", destination: "/projet/:path*", permanent: true },
      { source: "/deposer", destination: "/projet", permanent: true },
      { source: "/deposer/:path*", destination: "/projet/:path*", permanent: true },
      // Le bloc 2 de la fiche s'appelait « illustrations » pendant une journée.
      { source: "/projet/:id/illustrations", destination: "/projet/:id/documents", permanent: true },
    ];
  },
};

export default nextConfig;
