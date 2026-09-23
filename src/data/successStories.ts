import type { DiapoSucces } from "@/components/CarrouselSucces";

/*
 * Les success stories de l'accueil, dans l'ordre du carrousel.
 *
 * Tant qu'aucune vraie success story n'est prête, chaque panneau garde
 * un dégradé d'attente et renvoie vers sa fiche d'exemple (/succes/N).
 * Pour en publier une : remplacer le titre, la phrase, le lien, et
 * ajouter `image` (l'affiche ou une photo du tournage) avec son `imageAlt`.
 */
const DEGRADES = [
  "radial-gradient(120% 120% at 30% 20%, #6f7a80 0%, #39434a 55%, #14181b 100%)",
  "radial-gradient(120% 120% at 70% 25%, #8a8375 0%, #4a463d 55%, #17160f 100%)",
  "radial-gradient(120% 120% at 40% 30%, #6b7a6e 0%, #37423a 55%, #111614 100%)",
  "radial-gradient(120% 120% at 60% 15%, #7d7480 0%, #433d47 55%, #16131a 100%)",
  "radial-gradient(120% 120% at 25% 35%, #8a7a72 0%, #4a403b 55%, #191312 100%)",
  "radial-gradient(120% 120% at 75% 30%, #6d7886 0%, #38404d 55%, #12151c 100%)",
];

export const SUCCESS_STORIES: DiapoSucces[] = DEGRADES.map((fond, i) => ({
  id: `succes-${i}`,
  titre: "Success story à venir.",
  phrase:
    "Ici, un projet repéré sur WeFilmGood et devenu film ou série : son affiche, son parcours, son équipe.",
  fond,
  marque: `Projet ${i + 1}`,
  bouton: "Voir la fiche",
  href: `/succes/${i}`,
}));
