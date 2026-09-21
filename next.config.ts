import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Une adresse facile à retenir et à donner : app.wefilmgood.com/pitchotheque.
  async redirects() {
    return [{ source: "/pitchotheque", destination: "/projets", permanent: false }];
  },
};

export default nextConfig;
