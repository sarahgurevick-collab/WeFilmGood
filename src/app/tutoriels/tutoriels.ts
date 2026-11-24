/**
 * Les séquences filmées des tutoriels (08/11/2026, Sarah : « Peux-tu mettre
 * ces vidéos dans l'onglet tutoriel ? »). Les fichiers MP4 et leur image
 * d'attente sont posés sur le serveur dans /home/wfg/tutoriels, hors du
 * dépôt, et servis par /tutoriels/video/<slug>.mp4.
 *
 * `membres` : la vidéo montre l'intérieur du site (fiches, Galaxies…), elle
 * n'est servie qu'aux membres connectés. La connexion, elle, se montre à tous.
 * L'identifiant sert aussi d'ancre : la roue d'adhésion envoie vers
 * /tutoriels#galaxies et /tutoriels#fiche-projet.
 */
export type Tutoriel = { slug: string; titre: string; titreEn: string; membres: boolean };

export const TUTORIELS: Tutoriel[] = [
  { slug: "se-connecter", titre: "Se connecter", titreEn: "Log in", membres: false },
  // Films longs du 24/11 (Sarah : « un film un peu plus long qui répond à la
  // question Qu'est-ce que je peux faire avec WFG 2 »), tournés avec « My Project ».
  { slug: "que-faire-auteur", titre: "Que faire avec WeFilmGood — auteur", titreEn: "What you can do with WeFilmGood — writer", membres: true },
  { slug: "que-faire-producteur", titre: "Que faire avec WeFilmGood — producteur", titreEn: "What you can do with WeFilmGood — producer", membres: true },
  { slug: "mon-profil", titre: "Mon profil", titreEn: "My profile", membres: true },
  { slug: "fiche-projet", titre: "Créer une fiche projet", titreEn: "Create a project sheet", membres: true },
  { slug: "galaxies", titre: "Les Galaxies", titreEn: "The Galaxies", membres: true },
  // Films des bulles de l'adhésion (16/11) : titre = nom de la bulle.
  { slug: "credit-soleil", titre: "Crédit Soleil", titreEn: "Sun credit", membres: true },
  { slug: "acces-fiches", titre: "Accès fiches projets & personnages", titreEn: "Project & character sheets", membres: true },
  { slug: "cinematch", titre: "CinéMatch", titreEn: "CinéMatch", membres: true },
  { slug: "pack-soleils", titre: "Pack Soleils", titreEn: "Sun pack", membres: true },
  // Films courts du 24/11, découpés dans le même tournage (pas encore d'anglais :
  // la route sert le film français tant que le « -en » manque).
  { slug: "mots-cles-match", titre: "Mots-clés et match du projet", titreEn: "Keywords and project match", membres: true },
  { slug: "personnages", titre: "Les personnages", titreEn: "Characters", membres: true },
  { slug: "documents", titre: "Documents, moodboard, scénario, StoryPitch", titreEn: "Documents, moodboard, script, StoryPitch", membres: true },
  { slug: "talent-partage", titre: "Ajouter un talent et partager le projet", titreEn: "Add a talent and share the project", membres: true },
  { slug: "recherche", titre: "Chercher projets, talents, personnages", titreEn: "Search projects, talents, characters", membres: true },
  { slug: "soleil-favoris", titre: "Soleil et favoris", titreEn: "Sun and favourites", membres: true },
  { slug: "cinecrush", titre: "CinéCrush", titreEn: "CinéCrush", membres: true },
  { slug: "comedypitch", titre: "ComedyPitch", titreEn: "ComedyPitch", membres: true },
  { slug: "musicpitch", titre: "MusicPitch", titreEn: "MusicPitch", membres: true },
];

/**
 * Les mêmes films existent en anglais (site traduit par le globe), fichiers
 * suffixés « -en ». La langue se lit dans le cookie du globe (googtrans).
 */
export type LangueTutoriel = "fr" | "en";

export function langueDuCookie(valeur: string | undefined): LangueTutoriel {
  return valeur && /\/en$/.test(valeur) ? "en" : "fr";
}

export function nomDeFichier(slug: string, langue: LangueTutoriel): string {
  return langue === "en" ? `${slug}-en` : slug;
}

export const DOSSIER_TUTORIELS = "/home/wfg/tutoriels";
