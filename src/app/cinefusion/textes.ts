/**
 * Les textes de la page CinéMatch du Menu, tous ici pour être relus d'un
 * coup. PROPOSITIONS : à faire valider par Sarah avant la mise en ligne
 * (aucun libellé nouveau en ligne sans son accord).
 */
export const TEXTES = {
  titre: "CinéMatch",
  introVisiteur:
    "Répondez aux questions « si j'étais… » : nous cherchons le profil de la plateforme dont les réponses ressemblent le plus aux vôtres.",
  boutonVisiteur: "Voir mon meilleur match →",
  trop_peu: "Répondez à au moins 12 questions pour que nous puissions chercher votre meilleur match.",

  resultatTitre: "Votre meilleur match",
  resultatPourcent: (p: number) => `${p} % de réponses en commun`,
  resultatPoids: (communes: number, comparees: number) =>
    `${communes} réponses identiques sur ${comparees} questions`,
  aucunMatch: "Nous n'avons pas encore trouvé de profil à rapprocher de vos réponses. Revenez bientôt.",

  emailExplication:
    "Vos réponses sont mémorisées. Renseignez votre adresse email et découvrez vos statistiques : cliquez sur le lien magique pour vous connecter.",
  emailChamp: "Adresse email",
  emailBouton: "Découvrir mes statistiques",
  emailEnvoye: (email: string) =>
    `Un email vient d'être envoyé à ${email}. Cliquez sur le lien qu'il contient : vos réponses seront enregistrées et vous découvrirez vos statistiques.`,
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
