/**
 * Les textes de la page CinéMatch du Menu, tous ici pour être relus d'un
 * coup. PROPOSITIONS : à faire valider par Sarah avant la mise en ligne
 * (aucun libellé nouveau en ligne sans son accord).
 */
export const TEXTES = {
  titre: "CinéMatch",
  introVisiteur:
    "Répondez aux questions « si j'étais… » : nous cherchons le profil de la plateforme dont les réponses ressemblent le plus aux vôtres.",
  boutonVisiteur: "Enregistrer vos réponses",
  trop_peu: "Répondez à au moins 12 questions pour que nous puissions chercher votre meilleur match.",

  resultatTitre: "Votre meilleur match",
  resultatPourcent: (p: number) => `${p} % de réponses en commun`,
  resultatPoids: (communes: number, comparees: number) =>
    `${communes} réponses identiques sur ${comparees} questions`,
  aucunMatch: "Nous n'avons pas encore trouvé de profil à rapprocher de vos réponses. Revenez bientôt.",

  emailExplication:
    "Vos réponses sont mémorisées. Renseignez votre adresse email et cliquez sur le lien magique qui vous emmènera vers votre Match.",
  // « Êtes-vous du métier ? » : Non = adresse email seulement (Greenlighter),
  // Oui = l'inscription habituelle.
  questionMetier: "Êtes-vous cinéaste ?",
  questionMetierPrecision: "Auteur, producteur, comédien, réalisateur, compositeur…",
  reponsesMemorisees: "Vos réponses sont mémorisées.",
  reponseOui: "Oui",
  reponseNon: "Non",
  changerReponse: "← Changer de réponse",
  metierExplication:
    "Vos réponses sont mémorisées. Créez votre profil et cliquez sur le lien magique qui vous emmènera vers votre Match.",
  metierBouton: "Créer mon profil",
  champPrenom: "Prénom",
  champNom: "Nom",
  completerProfil: "Pour apparaître dans les Matchs des autres membres, complétez votre profil.",
  completerProfilLien: "Compléter mon profil",
  emailChamp: "Adresse email",
  emailBouton: "Découvrir mon Match",
  emailEnvoye: (email: string) =>
    `Un email vient d'être envoyé à ${email}. Cliquez sur le lien qu'il contient : vous découvrirez votre Match.`,
  emailRien: "Rien reçu après quelques minutes ? Regardez dans les indésirables.",
  emailInvalide: "Cette adresse email n'est pas valide.",

  // Le nom : un profil complet ET une adhésion (ou des Gooders, pas encore en vente).
  nomReserve: "Pour connaître son nom, il faut un profil complet et une adhésion.",
  nomProfilIncomplet: "Complétez votre profil pour connaître son nom.",
  voirProfilIncomplet: "Compléter mon profil",
  voirAdhesion: "Découvrir l'adhésion",
  voirProfil: "Voir son profil",
  reponsesVerrouillees:
    "Vos réponses sont mémorisées : elles ne se modifient plus. Vous pouvez répondre aux questions restées vides.",
  enregistre: "Vos réponses sont enregistrées.",
  retourBienvenue: "Bienvenue ! Vos réponses sont enregistrées.",
};
