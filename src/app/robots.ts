import type { MetadataRoute } from "next";

/**
 * La plateforme doit se trouver facilement ; ses membres, jamais.
 *
 * Ce qui vend WeFilmGood — accueil, tarifs, success stories, mentions
 * légales — reste ouvert aux moteurs. Tout ce qui désigne quelqu'un ou
 * expose le catalogue en est écarté.
 *
 * Ce fichier n'est qu'une consigne adressée aux moteurs bien élevés. Ce
 * qui protège réellement les profils, c'est l'authentification et les
 * règles d'accès en base.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/pitchotheque",
        "/projet", // fiches projet et liens de partage
        "/profil",
        "/lecteur",
        "/admin",
        "/auth",
        "/lost-pwd",
      ],
    },
  };
}
