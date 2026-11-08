import type { EtapeVisite } from "@/components/VisiteGuidee";

/**
 * Les textes des visites guidées (ESSAI du 17/10/2026, à faire valider par
 * Sarah : aucun libellé nouveau en ligne sans son accord). Visibles
 * seulement avec « ?visite=1 » dans l'adresse.
 */

/*
 * Versions anglaises (08/11/2026, Sarah : « les mêmes vidéos en anglais ») :
 * la traduction automatique du globe ne retraduit pas les bulles qui
 * changent, alors chaque étape porte son texte anglais. Traductions à faire
 * valider par Sarah.
 */
export const VISITE_INSCRIPTION: EtapeVisite[] = [
  {
    cible: '[data-visite="google"]',
    titre: "Le plus rapide : Google",
    texte: "Si vous avez un compte Google, un clic suffit : votre profil est créé et vous êtes connecté.",
    titreEn: "The fastest way: Google",
    texteEn: "If you have a Google account, one click is enough: your profile is created and you are logged in.",
  },
  {
    cible: '[data-visite="noms"]',
    titre: "Votre prénom et votre nom",
    texte: "C'est le nom que les autres membres verront. Si vous signez sous un nom de plume, c'est lui qu'il faut mettre ici.",
    titreEn: "Your first and last name",
    texteEn: "This is the name other members will see. If you write under a pen name, that is the one to put here.",
  },
  {
    cible: 'input[name="email"]',
    titre: "Votre adresse email",
    texte: "Pas de mot de passe sur WeFilmGood : c'est votre adresse qui vous connecte. Si vous étiez inscrit sur l'ancien site, utilisez la même adresse.",
    titreEn: "Your email address",
    texteEn: "No password on WeFilmGood: your address is what logs you in. If you were registered on the former site, use the same address.",
  },
  {
    cible: '[data-visite="creer"]',
    titre: "Créer mon profil",
    texte: "Un email vous est envoyé aussitôt. Cliquez sur le lien qu'il contient : votre profil est activé. Rien reçu ? Regardez dans les indésirables.",
    titreEn: "Create my profile",
    texteEn: "An email is sent to you right away. Click the link it contains: your profile is activated. Nothing received? Check your spam folder.",
  },
];

export const VISITE_NOUVELLE_FICHE: EtapeVisite[] = [
  {
    cible: '[data-visite="affiche"]',
    titre: "Votre fiche, en direct",
    texte: "Ici, votre fiche telle que la verront les producteurs. Elle se remplit au fur et à mesure que vous écrivez.",
    titreEn: "Your sheet, live",
    texteEn: "This is your sheet as producers will see it. It fills in as you write.",
  },
  {
    cible: '[data-visite="blocs"]',
    titre: "Trois blocs",
    texte: "La fiche, puis les documents, puis les personnages. Les deux derniers s'ouvrent une fois la fiche créée.",
    titreEn: "Three blocks",
    texteEn: "The sheet, then the documents, then the characters. The last two open once the sheet is created.",
  },
  {
    cible: 'input[name="title"]',
    titre: "Le titre",
    texte: "Le titre de votre projet. Si vous avez déjà une fiche au même titre, le site vous le signale.",
    titreEn: "The title",
    texteEn: "Your project's title. If you already have a sheet with the same title, the site lets you know.",
  },
  {
    cible: 'select[name="format"]',
    titre: "Le format",
    texte: "Long métrage, court métrage, série… Pour un court métrage, budget et audience disparaissent.",
    titreEn: "The format",
    texteEn: "Feature film, short film, series… For a short film, budget and audience disappear.",
  },
  {
    cible: '[data-visite="genre"]',
    titre: "Le genre, en escalier",
    texte: "Choisissez d'abord la famille, puis jusqu'à trois sous-genres, puis fiction ou documentaire, puis la technique. Chaque marche s'ouvre après la précédente.",
    titreEn: "The genre, step by step",
    texteEn: "Choose the family first, then up to three sub-genres, then fiction or documentary, then the technique. Each step opens after the previous one.",
  },
  {
    cible: 'textarea[name="tagline"]',
    titre: "La tagline",
    texte: "Une ou deux phrases courtes qui donnent envie. C'est elle qu'on lit sous votre projet dans les Galaxies.",
    titreEn: "The tagline",
    texteEn: "One or two short sentences that make people want more. It is what appears under your project in the Galaxies.",
  },
  {
    cible: 'textarea[name="logline"]',
    titre: "La logline",
    texte: "Un petit résumé de l'histoire, en quelques phrases.",
    titreEn: "The logline",
    texteEn: "A short summary of the story, in a few sentences.",
  },
  {
    cible: 'input[name="vignette"]',
    titre: "L'image de présentation",
    texte: "Elle représente votre projet dans les Galaxies. Format paysage, sans votre nom ni le titre. Sans image, le projet n'apparaît pas dans les Galaxies.",
    titreEn: "The presentation image",
    texteEn: "It represents your project in the Galaxies. Landscape format, without your name or the title. Without an image, the project does not appear in the Galaxies.",
  },
  {
    cible: '[data-visite="mots-cles"]',
    titre: "Vos mots-clés",
    texte: "Trois thèmes : sous-genres et styles, sujets et personnages, univers et lieux. Tapez un mot ou piochez dans le nuage, dix par thème au plus. Ils aident les producteurs à trouver votre projet.",
    titreEn: "Your keywords",
    texteEn: "Three themes: sub-genres and styles, subjects and characters, worlds and places. Type a word or pick from the cloud, ten per theme at most. They help producers find your project.",
  },
  {
    cible: '[data-visite="creer-fiche"]',
    titre: "Créer ma fiche projet",
    texte: "La fiche est créée. Vous passez ensuite aux documents (scénario, moodboard) et aux personnages.",
    titreEn: "Create my project sheet",
    texteEn: "The sheet is created. You then move on to the documents (script, moodboard) and the characters.",
  },
];
