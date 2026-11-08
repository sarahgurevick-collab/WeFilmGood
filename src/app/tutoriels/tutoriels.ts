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
  { slug: "mon-profil", titre: "Mon profil", titreEn: "My profile", membres: true },
  { slug: "fiche-projet", titre: "Créer une fiche projet", titreEn: "Create a project sheet", membres: true },
  { slug: "galaxies", titre: "Les Galaxies", titreEn: "The Galaxies", membres: true },
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
