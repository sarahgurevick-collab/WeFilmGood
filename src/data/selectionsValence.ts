import type { AnneeSelection } from "./selectionsCannes";

/**
 * Sélection du ScenarioLab à Valence Scénario, reprise de
 * maisondesscenaristes.org/blog/valence (Sarah, 23/10/2026) : titres
 * seulement, l'ancienne page ne donne pas les auteurs.
 */
export const SELECTIONS_VALENCE: AnneeSelection[] = [
  {
    annee: 2018,
    blocs: [
      {
        titre: "ScenarioLab",
        entrees: [
          '"Perspectives"',
          '"Complices à morts"',
          '"La frontière"',
          '"Sans domicile stable"',
        ],
      },
    ],
  },
];
