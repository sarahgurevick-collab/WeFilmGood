import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le modèle des vecteurs de sens (src/lib/vecteurs.ts) tourne dans Node,
  // pas dans le paquet du site : Next ne doit pas essayer de l'empaqueter.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp"],
  // Les photos sortent du téléphone à 3-20 Mo ; au-delà de 1 Mo (la limite
  // par défaut), l'envoi échouait sans rien dire. Elles sont allégées
  // ensuite sur le serveur avant d'être stockées.
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  // Aucune redirection d'anciennes adresses (07/11/2026, Sarah) : WFG 2
  // n'étant pas encore ouvert, les pages renommées (/pitchotheque devenue
  // /galaxies, /projets, /deposer…) ont changé d'adresse sans renvoi.
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
};

export default nextConfig;
