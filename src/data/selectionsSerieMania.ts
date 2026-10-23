import type { AnneeSelection } from "./selectionsCannes";

/**
 * Sélections des rencontres auteurs-producteurs à Série Mania (Lille),
 * reprises de maisondesscenaristes.org/blog/lille (Sarah, 23/10/2026) :
 * titres et pays seulement, l'ancienne page ne donne pas les auteurs.
 */
export const SELECTIONS_SERIE_MANIA: AnneeSelection[] = [
  {
    annee: 2019,
    blocs: [
      {
        titre: "Rencontres auteurs-producteurs",
        entrees: [
          '"Cerveau Direct" (France)',
          '"Fast Forward" (France)',
          '"Immortels" (Belgique)',
          '"HSA 2041" (France, Espagne)',
          '"Les mots des petits princes" (France)',
          "\"Ummo la fin d'un monde\" (France)",
          "\"Les enquêtes stupides de l'inspecteur Carpaccio\" (France)",
          '"La Milice" (France)',
        ],
      },
    ],
  },
  {
    annee: 2018,
    blocs: [
      {
        titre: "Rencontres auteurs-producteurs",
        entrees: [
          '"ARKHé"',
          '"THE WATCHERS"',
          '"CONFUSION INTIME"',
          '"DROPS"',
          '"FOOTBALL PALACE"',
          '"<GEEKGIRLS>"',
          '"LA SORCIÈRE"',
          '"LE PEUPLE DU VILLAGE"',
          '"LES CERNES DU TEMPS"',
          '"RASTA PIZZA"',
          '"TROUBLES CONTRAIRES"',
        ],
      },
    ],
  },
];
