import { RENCONTRES } from "./association";
import { SELECTIONS_CANNES, type AnneeSelection } from "./selectionsCannes";
import { SELECTIONS_CLERMONT_FERRAND } from "./selectionsClermontFerrand";
import { SELECTIONS_PCDV } from "./selectionsPCDV";
import { SELECTIONS_SATIS_VR } from "./selectionsSatisVR";
import { SELECTIONS_SERIE_MANIA } from "./selectionsSerieMania";

/**
 * Les festivals et résidences de « Notre histoire » (15/10/2026, Sarah) :
 * sur l'anneau de la page d'entrée, un logo par festival ; dans chaque
 * festival, la roue des années, les projets sélectionnés, puis les photos.
 *
 * Un logo manquant = une carte avec le nom. Les photos viennent des
 * rencontres de la page de l'association, rattachées par leur légende.
 */
export type Festival = {
  id: string;
  nom: string;
  /** Le logo, posé sur une carte claire (fond noir de la page). */
  logo?: string;
  /** true pour un logo rond (fichier carré) : affiché rond, sans carte. */
  logoRond?: boolean;
  /** true pour un logo blanc sur fond transparent : affiché tel quel,
      sans carte claire (Valence, 23/10). */
  logoClair?: boolean;
  selections: AnneeSelection[];
  /** Les photos des rencontres (légende contenant un de ces mots). */
  motsPhotos: string[];
};

export const FESTIVALS: Festival[] = [
  { id: "cannes", nom: "Festival de Cannes", logo: "/festivals/marche-du-film.png", selections: SELECTIONS_CANNES, motsPhotos: ["Cannes"] },
  { id: "clermont-ferrand", nom: "Clermont-Ferrand", logo: "/festivals/clermont-ferrand.jpg", logoRond: true, selections: SELECTIONS_CLERMONT_FERRAND, motsPhotos: ["Clermont"] },
  { id: "pcdv", nom: "Paris Courts Devant", logo: "/festivals/paris-courts-devant.png", logoRond: true, selections: SELECTIONS_PCDV, motsPhotos: ["Paris Courts Devant"] },
  { id: "serie-mania", nom: "Série Mania", logo: "/festivals/serie-mania.jpg", logoRond: true, selections: SELECTIONS_SERIE_MANIA, motsPhotos: ["Série Mania", "Series Mania"] },
  { id: "valence", nom: "Valence", logo: "/festivals/valence.png", logoClair: true, selections: [], motsPhotos: ["Valence"] },
  { id: "satis-vr", nom: "SATIS/VR-360°", logo: "/festivals/satis.png", selections: SELECTIONS_SATIS_VR, motsPhotos: ["SATIS", "360"] },
  // Festival partenaire (Sarah, 23/10) : visuel provisoire en attendant
  // le logo ; années, mois et sélections à venir.
  { id: "regards", nom: "Regards sur le cinéma du Monde", logo: "/festivals/regards.png", selections: [], motsPhotos: ["Regards sur le cinéma"] },
  { id: "maison-bleue", nom: "Résidence d'écriture « La Maison Bleue »", selections: [], motsPhotos: ["Maison Bleue"] },
];

/**
 * Le mois où le festival a lieu, par année (1 = janvier), pour la frise de
 * « Notre histoire ». Paris Courts Devant change d'époque selon l'édition
 * (Sarah, 23/10/2026) : novembre 2013 et 2014, décembre 2015 et 2016, novembre
 * 2017 et 2019, pas de festival en 2018, janvier de 2020 à 2027. Cannes
 * est en mai, Clermont-Ferrand en février, SATIS/VR en novembre. Les autres : inconnu, pas de
 * mois affiché.
 */
const MOIS_FESTIVAL: Record<string, { parDefaut?: number; parAnnee?: Record<number, number> }> = {
  cannes: { parDefaut: 5 },
  "clermont-ferrand": { parDefaut: 2 },
  // SATIS/VR-360° en novembre (Sarah, 23/10).
  "satis-vr": { parDefaut: 11 },
  pcdv: {
    parAnnee: {
      2013: 11,
      2014: 11,
      2015: 12,
      2016: 12,
      2017: 11,
      2019: 11,
      2020: 1,
      2021: 1,
      2022: 1,
      2023: 1,
      2024: 1,
      2025: 1,
      2026: 1,
      2027: 1,
    },
  },
};

const NOMS_DES_MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** Le numéro du mois (1-12) du festival cette année-là, s'il est connu. */
export function moisDuFestival(f: Festival, annee: number): number | undefined {
  const m = MOIS_FESTIVAL[f.id];
  return m?.parAnnee?.[annee] ?? m?.parDefaut;
}

export function nomDuMois(mois: number): string {
  return NOMS_DES_MOIS[mois - 1] ?? "";
}

export function festivalParId(id: string): Festival | undefined {
  return FESTIVALS.find((f) => f.id === id);
}

export function photosDuFestival(f: Festival): { image: string; legende: string }[] {
  return RENCONTRES.filter((r) => f.motsPhotos.some((m) => r.legende.toLowerCase().includes(m.toLowerCase())));
}

/** Les années d'un festival, de la plus récente à la plus ancienne. */
export function anneesDuFestival(f: Festival): number[] {
  return f.selections
    .map((s) => s.annee)
    .filter((a): a is number => typeof a === "number")
    .sort((a, b) => b - a);
}
