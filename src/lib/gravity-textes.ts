/**
 * Tous les textes du soleil du jour et des favoris, au même endroit
 * (12/11/2026). Le crédit s'appelait « Gravity » ; il s'appelle « soleil »
 * depuis le 13/11 (phrases validées par Sarah ce jour-là, une par une).
 * Les noms du code (GRAVITY, gravity_ouvertures…) n'ont pas changé.
 */
export const GRAVITY = {
  /** Le bouton, pour un adhérent qui a encore son soleil du jour. */
  bouton: "Ouvrir ce projet avec mon soleil du jour",
  /** Sous le bouton : ce que l'ouverture donne (mots du pricing : videopitch, contact des Talents). */
  ceQuiSOuvre: "Le videopitch s’ouvre, vous voyez l’équipe et vous pouvez contacter ses Talents.",
  /** Adhérent, soleil du jour déjà dépensé sur un autre projet. */
  dejaUtilise: "Vous avez déjà utilisé votre soleil du jour. Un nouveau soleil vous attend demain.",
  /** À la suite, en lien vers /adhesion (Sarah, 12/11 : dire à l'adhérent qu'il peut acheter un Pack à tarif préférentiel). */
  packAdherent: "Pour ouvrir d’autres projets dès aujourd’hui, le Pack Soleils est à tarif préférentiel pour les adhérents.",
  /** Sans adhésion (Sarah, 12/11 : ajouter le Pack Soleils, qu'un non-adhérent peut acheter). */
  sansAdhesion: "Pour ouvrir ce projet, vous avez besoin d’une adhésion ou d’un Pack Soleils.",
  /** Projet déjà ouvert : suivi de la date. */
  ouvertLe: "Projet ouvert le",
  /** Bulle de l'enveloppe barrée, pour un adhérent qui n'a pas ouvert le projet. */
  enveloppe: "Pour contacter ce talent, ouvrez ce projet avec votre soleil.",
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
