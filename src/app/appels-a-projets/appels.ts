/*
 * Les appels à projets, dans l'ordre des dates limites. Chaque ligne nourrit
 * la frise de la page : logo du festival, date limite en gros, format et
 * événement. Pour un nouvel appel : ajouter une ligne, la frise s'allonge
 * d'elle-même. Les textes de l'appel (modalités, sélection, frais) sont dans
 * page.tsx, derrière le bouton « Lire le texte de l'appel à projets ».
 */
export type Appel = {
  id: string;
  festival: string;
  /** L'édition visée, affichée après le nom du festival. */
  edition: string;
  format: "Court métrage" | "Long métrage";
  logo: string;
  /** true pour un logo large sur fond transparent (Cannes) : posé dans un
      carré blanc au lieu d'être rogné en rond. */
  logoLarge?: boolean;
  /** Date limite de dépôt, au format AAAA-MM-JJ. */
  dateLimite: string;
  /** Heure limite, si elle est annoncée. */
  heureLimite?: string;
  /** Ce qui attend les auteurs sélectionnés, en une ligne. */
  evenement: string;
};

export const APPELS: Appel[] = [
  {
    id: "clermont-2026",
    festival: "Clermont-Ferrand",
    edition: "48e Festival International du Court Métrage, 2026",
    format: "Court métrage",
    logo: "/festivals/clermont-ferrand.jpg",
    dateLimite: "2025-11-08",
    heureLimite: "23h59 (heure française)",
    evenement: "Rencontres auteurs-producteurs pendant le festival",
  },
  {
    id: "cannes-2026",
    festival: "Festival de Cannes",
    edition: "« Les Pitchs sans frontières », 3e édition, 2026",
    format: "Long métrage",
    logo: "/festivals/festival-de-cannes.png",
    logoLarge: true,
    dateLimite: "2026-03-10",
    heureLimite: "23h59 (heure française)",
    evenement: "Pitch en direct devant les professionnels au Marché du Film",
  },
  {
    id: "paris-courts-devant-2027",
    festival: "Paris Courts Devant",
    edition: "Appel à pitchs long métrage francophone, 2027",
    format: "Long métrage",
    logo: "/festivals/paris-courts-devant.jpg",
    dateLimite: "2026-10-26",
    evenement: "Présentation du projet aux professionnels du secteur",
  },
];

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** « 26 octobre 2026 » à partir de « 2026-10-26 », sans dépendre de la
    locale du serveur ni du navigateur (même rendu des deux côtés). */
export function dateEnLettres(iso: string): string {
  const [a, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${a}`;
}

export function annee(iso: string): string {
  return iso.slice(0, 4);
}
