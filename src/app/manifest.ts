import type { MetadataRoute } from "next";

/**
 * WeFilmGood s'installe comme une application : sur l'écran d'accueil
 * du téléphone (et le bureau de l'ordinateur), avec son icône, en plein
 * écran, sans la barre d'adresse du navigateur.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WeFilmGood",
    short_name: "WeFilmGood",
    description:
      "La plateforme de rencontres Auteurs — Producteurs de la Maison des Scénaristes.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
