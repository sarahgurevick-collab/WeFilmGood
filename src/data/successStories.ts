import type { DiapoSucces } from "@/components/CarrouselSucces";

/*
 * Les success stories de l'accueil, dans l'ordre du carrousel.
 *
 * Tant qu'aucune vraie success story n'est prête, chaque panneau garde
 * un dégradé d'attente et renvoie vers sa fiche d'exemple (/succes/N).
 * Pour en publier une : remplacer le titre, la phrase, le lien (un clic sur le panneau ouvert y mène), et
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

/**
 * Les vraies success stories, avec leur place dans le carrousel (1 = le
 * panneau ouvert à l'arrivée). Les places libres gardent l'attente.
 */
export const VRAIES: { position: number; diapo: DiapoSucces }[] = [
  {
    position: 1,
    diapo: {
      id: "you-will-die-at-twenty",
      // Texte provisoire, relevé sur l'affiche : à remplacer par celui de Sarah.
      titre: "You Will Die at Twenty, d'Amjad Abu Alala.",
      phrase: "Lion du futur (meilleur premier film) à la Mostra de Venise 2019.",
      image: "/succes/you-will-die-at-twenty.jpg",
      imageAlt: "Affiche du film You Will Die at Twenty d'Amjad Abu Alala",
      marque: "You Will Die at Twenty",
    },
  },
  {
    position: 2,
    diapo: {
      id: "ava",
      // Texte provisoire, relevé sur l'affiche : à remplacer par celui de Sarah.
      titre: "Ava, de Sadaf Foroughi.",
      phrase: "Prix FIPRESCI au Festival international du film de Toronto 2017.",
      image: "/succes/ava.jpg",
      imageAlt: "Affiche du film Ava de Sadaf Foroughi",
      marque: "Ava",
    },
  },
  {
    position: 3,
    diapo: {
      id: "my-little-one",
      // Texte provisoire, relevé sur l'affiche : à remplacer par celui de Sarah.
      titre: "My Little One, de Frédéric Choffat et Julie Gilbert.",
      phrase: "Avec Anna Mouglalis, Mathieu Demy, Vincent Bonillo et Ruby Matenko.",
      image: "/succes/my-little-one.jpg",
      imageAlt: "Affiche du film My Little One de Frédéric Choffat et Julie Gilbert",
      marque: "My Little One",
    },
  },
  {
    position: 4,
    diapo: {
      id: "les-bienheureux",
      // Texte provisoire, relevé sur l'affiche : à remplacer par celui de Sarah.
      titre: "Les Bienheureux, de Sofia Djama.",
      phrase:
        "Mostra de Venise 2017 (Orizzonti, prix d'interprétation féminine), Bayard de la meilleure première œuvre de fiction au FIFF de Namur.",
      image: "/succes/les-bienheureux.jpg",
      imageAlt: "Affiche du film Les Bienheureux de Sofia Djama",
      marque: "Les Bienheureux",
    },
  },
  {
    position: 5,
    diapo: {
      id: "new-territories",
      // Texte provisoire, relevé sur l'affiche : à remplacer par celui de Sarah.
      // Image petite (310 px de large) : une version plus grande sera plus nette.
      titre: "New Territories, de Fabianny Deschamps.",
      phrase: "Avec Eve Bitoun et Yilin Yang. Sélection ACID Cannes.",
      image: "/succes/new-territories.jpg",
      imageAlt: "Affiche du film New Territories de Fabianny Deschamps",
      marque: "New Territories",
    },
  },
  {
    position: 6,
    diapo: {
      id: "doha-the-rising-sun",
      // Texte provisoire, relevé sur le visuel : à remplacer par celui de Sarah.
      // Visuel carré, mis au format affiche en prolongeant son fond rose.
      titre: "Doha – The Rising Sun, d'Eimi Imanishi.",
      phrase: "Sélection Final Cut, D'A Film Lab Barcelona 2025.",
      image: "/succes/doha-the-rising-sun.jpg",
      imageAlt: "Visuel du film Doha – The Rising Sun d'Eimi Imanishi",
      marque: "Doha – The Rising Sun",
    },
  },
  {
    position: 7,
    diapo: {
      id: "when-im-done-dying",
      // Texte provisoire, relevé sur l'affiche : à remplacer par celui de Sarah.
      titre: "When I'm Done Dying, de Nisan Dag.",
      phrase: "Sélection officielle en compétition, Tallinn Black Nights Film Festival 2020.",
      image: "/succes/when-im-done-dying.jpg",
      imageAlt: "Affiche du film When I'm Done Dying de Nisan Dag",
      marque: "When I'm Done Dying",
    },
  },
];

const EN_ATTENTE: DiapoSucces[] = DEGRADES.map((fond, i) => ({
  id: `succes-${i}`,
  titre: "Success story à venir.",
  phrase:
    "Ici, un projet repéré sur WeFilmGood et devenu film ou série : son affiche, son parcours, son équipe.",
  fond,
  marque: `Projet ${i + 1}`,
  href: `/succes/${i}`,
}));

// Six panneaux : chaque vraie à sa place, l'attente dans les places libres.
const NOMBRE = Math.max(6, ...VRAIES.map((v) => v.position));
const attente = [...EN_ATTENTE];
export const SUCCESS_STORIES: DiapoSucces[] = Array.from(
  { length: NOMBRE },
  (_, i) => VRAIES.find((v) => v.position === i + 1)?.diapo ?? attente.shift()!,
);

/** Tous les films réalisés, dans l'ordre du carrousel (page /succes). */
export const FILMS_REALISES: DiapoSucces[] = [...VRAIES]
  .sort((a, b) => a.position - b.position)
  .map((v) => v.diapo);
