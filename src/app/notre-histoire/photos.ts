import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { FESTIVALS, type Festival } from "@/data/festivals";

/*
 * Les photos de « Notre histoire », par festival et par année (23/10/2026,
 * décision de Sarah : « je t'enverrai les photos classées »).
 *
 * Rangement sur le serveur, rien à coder par photo :
 *   public/histoire/<identifiant du festival>/<année>/<photo>.jpg
 * par exemple public/histoire/cannes/2023/01.jpg. Les identifiants sont
 * ceux de src/data/festivals.ts (cannes, clermont-ferrand, pcdv,
 * serie-mania, valence, satis-vr, maison-bleue). Les photos d'une année
 * s'affichent dans l'ordre de leur nom de fichier.
 *
 * Lu à chaque affichage (la page est dynamique) : déposer un fichier
 * suffit, sans reconstruire le site.
 */

export type PhotoEvenement = { src: string; alt: string };

const DOSSIER = join(process.cwd(), "public", "histoire");
const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

function lireDossier(chemin: string): string[] {
  try {
    return readdirSync(chemin).sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
  } catch {
    return [];
  }
}

function estImage(nom: string): boolean {
  const i = nom.lastIndexOf(".");
  return i > 0 && EXTENSIONS.has(nom.slice(i).toLowerCase());
}

/** Les photos d'un festival, année par année ({ 2023: [...], 2024: [...] }). */
export function photosDuFestivalParAnnee(f: Festival): Record<number, PhotoEvenement[]> {
  const resultat: Record<number, PhotoEvenement[]> = {};
  const dossierFestival = join(DOSSIER, f.id);
  for (const nomAnnee of lireDossier(dossierFestival)) {
    const annee = Number(nomAnnee);
    if (!Number.isInteger(annee)) continue;
    const dossierAnnee = join(dossierFestival, nomAnnee);
    let estDossier = false;
    try {
      estDossier = statSync(dossierAnnee).isDirectory();
    } catch {
      estDossier = false;
    }
    if (!estDossier) continue;
    const photos = lireDossier(dossierAnnee)
      .filter(estImage)
      .map((nom) => ({
        src: `/histoire/${f.id}/${nomAnnee}/${encodeURIComponent(nom)}`,
        alt: `${f.nom} · ${annee}`,
      }));
    if (photos.length > 0) resultat[annee] = photos;
  }
  return resultat;
}

/** La première photo de chaque année, tous festivals confondus, dans
    l'ordre des festivals : pour la frise, quand l'année n'a pas d'affiche. */
export function premierePhotoParAnnee(): Record<number, PhotoEvenement> {
  const resultat: Record<number, PhotoEvenement> = {};
  for (const f of FESTIVALS) {
    const parAnnee = photosDuFestivalParAnnee(f);
    for (const [annee, photos] of Object.entries(parAnnee)) {
      const a = Number(annee);
      if (!resultat[a] && photos[0]) resultat[a] = photos[0];
    }
  }
  return resultat;
}
