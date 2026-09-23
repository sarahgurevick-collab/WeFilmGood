import "server-only";

import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export type Atelier = {
  id: string;
  titre: string;
  description: string | null;
  debut: string;
  duree_minutes: number;
  salle: string;
  rediffusion_fichier: string | null;
  rediffusion_envoyee_le: string | null;
};

export const CHAMPS_ATELIER =
  "id, titre, description, debut, duree_minutes, salle, rediffusion_fichier, rediffusion_envoyee_le";

/** La salle s'ouvre une demi-heure avant, et reste ouverte une heure après la fin prévue. */
const OUVERTURE_AVANT_MIN = 30;
const PROLONGATION_MIN = 60;

export type Phase = "a-venir" | "ouvert" | "termine";

export function phaseAtelier(a: Pick<Atelier, "debut" | "duree_minutes">, maintenant = Date.now()): Phase {
  const debut = new Date(a.debut).getTime();
  const ouverture = debut - OUVERTURE_AVANT_MIN * 60_000;
  const fermeture = debut + (a.duree_minutes + PROLONGATION_MIN) * 60_000;
  if (maintenant < ouverture) return "a-venir";
  if (maintenant > fermeture) return "termine";
  return "ouvert";
}

/** « mardi 14 octobre à 18 h 30 », à l'heure de Paris. */
export function dateAtelier(iso: string): string {
  const d = new Date(iso);
  const jour = d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
  const heure = d
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })
    .replace(":", " h ");
  return `${jour} à ${heure}`;
}

/**
 * Convertit la saisie d'un champ date-heure (« 2026-10-14T18:30 »), lue
 * comme l'heure de Paris, en instant UTC. Le serveur tourne en UTC : sans
 * cette conversion, un atelier prévu à 18 h 30 démarrerait à 20 h 30.
 */
export function parisVersIso(saisie: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(saisie);
  if (!m) return null;
  const [, a, mo, j, h, mi] = m.map(Number);
  const commeUtc = Date.UTC(a, mo - 1, j, h, mi);
  // Décalage de Paris à cet instant (1 h l'hiver, 2 h l'été).
  const vuAParis = new Date(
    new Date(commeUtc).toLocaleString("en-US", { timeZone: "Europe/Paris" }),
  ).getTime();
  const vuEnUtc = new Date(
    new Date(commeUtc).toLocaleString("en-US", { timeZone: "UTC" }),
  ).getTime();
  return new Date(commeUtc - (vuAParis - vuEnUtc)).toISOString();
}

/** L'inverse, pour préremplir le champ date-heure. */
export function isoVersParis(iso: string): string {
  const d = new Date(iso);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Nom de salle lisible et difficile à deviner : « scenario-de-serie-4f9a ». */
export function nomDeSalle(titre: string): string {
  const base = titre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  const suffixe = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return `${base || "atelier"}-${suffixe}`;
}

// ---------------------------------------------------------------------
// Enregistrements : Jibri dépose chaque enregistrement dans
// <dossier>/<session>/<salle>_<date>.mp4, sur ce même serveur.
// ---------------------------------------------------------------------

function dossierEnregistrements(): string {
  return process.env.JITSI_RECORDINGS_DIR ?? "/home/wfg/.jitsi-meet-cfg/storage/jibri/recordings";
}

export type Enregistrement = { fichier: string; taille: number; date: Date };

export async function enregistrementsDeLaSalle(salle: string): Promise<Enregistrement[]> {
  const racine = dossierEnregistrements();
  let sessions: string[] = [];
  try {
    sessions = await readdir(/* turbopackIgnore: true */ racine);
  } catch {
    return [];
  }
  const trouves: Enregistrement[] = [];
  for (const s of sessions) {
    let fichiers: string[] = [];
    try {
      fichiers = await readdir(path.join(/* turbopackIgnore: true */ racine, s));
    } catch {
      continue;
    }
    for (const f of fichiers) {
      if (!f.toLowerCase().startsWith(`${salle}_`) || !f.endsWith(".mp4")) continue;
      const relatif = `${s}/${f}`;
      const info = await stat(path.join(/* turbopackIgnore: true */ racine, relatif));
      trouves.push({ fichier: relatif, taille: info.size, date: info.mtime });
    }
  }
  return trouves.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Chemin absolu d'un enregistrement, ou null s'il sort du dossier : le
 * nom vient de la base, mais on ne laisse jamais « ../ » remonter ailleurs.
 */
export function cheminEnregistrement(relatif: string): string | null {
  const racine = path.resolve(/* turbopackIgnore: true */ dossierEnregistrements());
  const complet = path.resolve(/* turbopackIgnore: true */ racine, relatif);
  return complet.startsWith(`${racine}${path.sep}`) ? complet : null;
}
