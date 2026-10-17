import type { EtapeVisite } from "@/components/VisiteGuidee";

/**
 * Les textes des visites guidées (ESSAI du 17/10/2026, à faire valider par
 * Sarah : aucun libellé nouveau en ligne sans son accord). Visibles
 * seulement avec « ?visite=1 » dans l'adresse.
 */

export const VISITE_INSCRIPTION: EtapeVisite[] = [
  {
    cible: '[data-visite="google"]',
    titre: "Le plus rapide : Google",
    texte: "Si vous avez un compte Google, un clic suffit : votre profil est créé et vous êtes connecté.",
  },
  {
    cible: '[data-visite="noms"]',
    titre: "Votre prénom et votre nom",
    texte: "C'est le nom que les autres membres verront. Si vous signez sous un nom de plume, c'est lui qu'il faut mettre ici.",
  },
  {
    cible: 'input[name="email"]',
    titre: "Votre adresse email",
    texte: "Pas de mot de passe sur WeFilmGood : c'est votre adresse qui vous connecte. Si vous étiez inscrit sur l'ancien site, utilisez la même adresse.",
  },
  {
    cible: '[data-visite="creer"]',
    titre: "Créer mon profil",
    texte: "Un email vous est envoyé aussitôt. Cliquez sur le lien qu'il contient : votre profil est activé. Rien reçu ? Regardez dans les indésirables.",
  },
];

export const VISITE_NOUVELLE_FICHE: EtapeVisite[] = [
  {
    cible: '[data-visite="affiche"]',
    titre: "Votre fiche, en direct",
    texte: "Ici, votre fiche telle que la verront les producteurs. Elle se remplit au fur et à mesure que vous écrivez.",
  },
  {
    cible: '[data-visite="blocs"]',
    titre: "Trois blocs",
    texte: "La fiche, puis les documents, puis les personnages. Les deux derniers s'ouvrent une fois la fiche créée.",
  },
  {
    cible: 'input[name="title"]',
    titre: "Le titre",
    texte: "Le titre de votre projet. Si vous avez déjà une fiche au même titre, le site vous le signale.",
  },
  {
    cible: 'select[name="format"]',
    titre: "Format et genre",
    texte: "Long métrage, court métrage, série… et le genre principal. Pour un court métrage, budget et audience disparaissent.",
  },
  {
    cible: 'textarea[name="tagline"]',
    titre: "La tagline",
    texte: "Une ou deux phrases courtes qui donnent envie. C'est elle qu'on lit sous votre projet dans les Galaxies.",
  },
  {
    cible: 'textarea[name="logline"]',
    titre: "La logline",
    texte: "Un petit résumé de l'histoire, en quelques phrases.",
  },
  {
    cible: 'input[name="vignette"]',
    titre: "L'image de présentation",
    texte: "Elle représente votre projet dans les Galaxies. Format paysage, sans votre nom ni le titre. Sans image, le projet n'apparaît pas dans les Galaxies.",
  },
  {
    cible: '[data-visite="creer-fiche"]',
    titre: "Créer ma fiche projet",
    texte: "La fiche est créée. Vous passez ensuite aux documents (scénario, moodboard) et aux personnages.",
  },
];
