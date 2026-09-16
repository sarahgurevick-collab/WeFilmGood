import type { MetadataRoute } from "next";

/**
 * WeFilmGood ne fait pas commerce de la présence de ses membres : on ne
 * doit pas pouvoir découvrir par une recherche qu'un comédien ou un
 * producteur a un profil ici. Rien n'est proposé à l'indexation.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
