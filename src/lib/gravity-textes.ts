/**
 * Tous les textes du Gravity du jour et des favoris, au même endroit
 * (12/11/2026). PROVISOIRES : proposés à Sarah, à valider ou à réécrire —
 * aucun n'est d'elle, sauf mention.
 */
export const GRAVITY = {
  /** Le bouton, pour un adhérent qui a encore son Gravity du jour. */
  bouton: "Ouvrir ce projet avec mon Gravity du jour",
  /** Sous le bouton : ce que l'ouverture donne (mots du pricing : videopitch, contact des Talents). */
  ceQuiSOuvre: "Le videopitch s’ouvre, vous voyez l’équipe et vous pouvez contacter ses Talents.",
  /** Adhérent, Gravity du jour déjà dépensé sur un autre projet. */
  dejaUtilise: "Vous avez déjà utilisé votre Gravity du jour. Un nouveau Gravity vous attend demain.",
  /** À la suite, en lien vers /adhesion (Sarah, 12/11 : dire à l'adhérent qu'il peut acheter un Pack à tarif préférentiel). */
  packAdherent: "Pour ouvrir d’autres projets dès aujourd’hui, le Pack Gravity est à tarif préférentiel pour les adhérents.",
  /** Sans adhésion (Sarah, 12/11 : ajouter le Pack Gravity, qu'un non-adhérent peut acheter). */
  sansAdhesion: "Pour ouvrir ce projet, vous avez besoin d’une adhésion ou d’un Pack Gravity.",
  /** Projet déjà ouvert : suivi de la date. */
  ouvertLe: "Projet ouvert le",
  /** Bulle de l'enveloppe barrée, pour un adhérent qui n'a pas ouvert le projet. */
  enveloppe: "Pour contacter ce talent, ouvrez ce projet avec votre Gravity.",
  favoris: {
    titre: "Mes favoris",
    lien: "Mes favoris",
    ajouter: "Mettre de côté",
    retirer: "Retirer de mes favoris",
    ouverts: "Projets ouverts",
    deCote: "Projets mis de côté",
    aucunOuvert: "Vous n’avez pas encore ouvert de projet.",
    aucunDeCote: "Vous n’avez mis aucun projet de côté.",
  },
} as const;
