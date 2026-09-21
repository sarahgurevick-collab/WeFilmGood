import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La Pitchothèque vit à app.wefilmgood.com/pitchotheque ; l'ancienne
  // adresse /projets y renvoie (les fiches restent sous /projets/<id>).
  async redirects() {
    return [{ source: "/projets", destination: "/pitchotheque", permanent: true }];
  },
};

export default nextConfig;
