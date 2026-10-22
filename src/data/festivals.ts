import { RENCONTRES } from "./association";
import { SELECTIONS_CANNES, type AnneeSelection } from "./selectionsCannes";
import { SELECTIONS_CLERMONT_FERRAND } from "./selectionsClermontFerrand";
import { SELECTIONS_PCDV } from "./selectionsPCDV";
import { SELECTIONS_SATIS_VR } from "./selectionsSatisVR";

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
  selections: AnneeSelection[];
  /** Les photos des rencontres (légende contenant un de ces mots). */
  motsPhotos: string[];
};

export const FESTIVALS: Festival[] = [
  { id: "cannes", nom: "Festival de Cannes", logo: "/festivals/marche-du-film.png", selections: SELECTIONS_CANNES, motsPhotos: ["Cannes"] },
  { id: "clermont-ferrand", nom: "Clermont-Ferrand", logo: "/festivals/clermont-ferrand.jpg", selections: SELECTIONS_CLERMONT_FERRAND, motsPhotos: ["Clermont"] },
  { id: "pcdv", nom: "Paris Courts Devant", logo: "/festivals/paris-courts-devant.jpg", selections: SELECTIONS_PCDV, motsPhotos: ["Paris Courts Devant"] },
  { id: "serie-mania", nom: "Série Mania", selections: [], motsPhotos: ["Série Mania", "Series Mania"] },
  { id: "valence", nom: "Valence", selections: [], motsPhotos: ["Valence"] },
  { id: "satis-vr", nom: "SATIS/VR-360°", selections: SELECTIONS_SATIS_VR, motsPhotos: ["SATIS", "360"] },
  { id: "maison-bleue", nom: "Résidence d'écriture « La Maison Bleue »", selections: [], motsPhotos: ["Maison Bleue"] },
];

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
