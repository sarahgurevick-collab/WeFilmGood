import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Adresses : la Pitchothèque à /pitchotheque, une fiche projet à
  // /projet/<id>, sa création à /projet. Les anciennes adresses (/projets,
  // /projets/<id>, /deposer) y renvoient : les liens déjà partagés tiennent.
  async redirects() {
    return [
      { source: "/projets", destination: "/pitchotheque", permanent: true },
      { source: "/projets/:path*", destination: "/projet/:path*", permanent: true },
      { source: "/deposer", destination: "/projet", permanent: true },
      { source: "/deposer/:path*", destination: "/projet/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
