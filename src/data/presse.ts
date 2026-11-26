/**
 * Les articles de presse sur la Maison des Scénaristes et WeFilmGood
 * (26/11/2026, Sarah). Sarah les donne un à un.
 *
 * On ne recopie pas les articles : les journaux interdisent la reproduction
 * sans autorisation (mention de News Tank). Pour chacun : le journal, la
 * date, le titre, un court résumé et une ou deux citations courtes.
 */
export type ArticlePresse = {
  /** Identifiant stable, pour la roue des titres. */
  id: string;
  journal: string;
  /** Date de parution, au format AAAA-MM-JJ. */
  date: string;
  titre: string;
  /** Le journaliste, s'il est connu. */
  auteur?: string;
  resume: string;
  citations?: string[];
  /** Le lien vers l'article en ligne, s'il existe encore. */
  lien?: string;
};

export const ARTICLES_PRESSE: ArticlePresse[] = [
  {
    id: "news-tank-2015-06-01",
    journal: "News Tank Digital",
    date: "2015-06-01",
    titre: "« L’idée est d’inverser un peu le système »",
    auteur: "Florian Krieg",
    resume:
      "Entretien avec Sarah Gurevick et Nicolas Zappi, cofondateurs de la Maison des Scénaristes, au lendemain du 68e Festival de Cannes : 250 projets reçus, 24 sélectionnés et présentés aux producteurs en trois sessions. Ils reviennent sur le marché du « on spec », le vidéo pitch anonyme et le bilan de quatre années à Cannes : 41 contrats signés pour 150 projets présentés.",
    citations: [
      "Généralement, ce sont les producteurs qui sont derrière la table et les auteurs qui défilent, nous faisons le contraire.",
      "90 % de nos auteurs sélectionnés sont des professionnels.",
    ],
  },
];
