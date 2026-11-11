import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Les photos nettes des membres sous clé (11/11/2026, demande de Sarah).
 *
 * Jusqu'ici le dossier « avatars » était public : n'importe qui, même sans
 * compte, pouvait en dresser la liste et télécharger toutes les photos
 * nettes — le flou de la Galaxie de Talents ne protégeait donc rien.
 * Le dossier est maintenant fermé (migration 0256). Une photo nette ne
 * sort plus que par la route /api/photo, avec une adresse signée par le
 * serveur : la page qui a le droit de montrer la photo nette fabrique
 * l'adresse ici, et cette adresse cesse de marcher au bout d'un à deux
 * jours. Sans cette signature, rien ne sort.
 *
 * La colonne profiles.avatar_url garde l'ancienne adresse « publique » :
 * elle ne mène plus nulle part, elle sert seulement à retrouver le fichier.
 */
const DOSSIER = "avatars";
const REPERE = `/storage/v1/object/public/${DOSSIER}/`;
const JOUR = 24 * 60 * 60;

function secret(): Buffer | null {
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!cle) return null;
  return createHash("sha256").update(`photos-nettes:${cle}`).digest();
}

function signature(chemin: string, echeance: number): string | null {
  const s = secret();
  if (!s) return null;
  return createHmac("sha256", s).update(`${chemin}\n${echeance}`).digest("base64url");
}

/** Le chemin du fichier dans le dossier des photos, tiré de l'adresse gardée dans le profil. */
export function cheminDeLaPhoto(adresse: string | null | undefined): string | null {
  if (!adresse) return null;
  const i = adresse.indexOf(REPERE);
  if (i < 0) return null;
  try {
    return decodeURIComponent(adresse.slice(i + REPERE.length).split("?")[0]);
  } catch {
    return null;
  }
}

/** L'adresse signée d'un fichier du dossier des photos (la photo entière gardée pour le cadrage, par exemple). */
export function photoDuChemin(chemin: string | null | undefined): string | null {
  if (!chemin) return null;
  // L'échéance tombe à minuit, entre un et deux jours plus tard : l'adresse
  // reste la même toute la journée, le navigateur garde la photo en mémoire.
  const echeance = (Math.floor(Date.now() / 1000 / JOUR) + 2) * JOUR;
  const s = signature(chemin, echeance);
  if (!s) return null;
  return `/api/photo?c=${encodeURIComponent(chemin)}&e=${echeance}&s=${s}`;
}

/**
 * L'adresse à envoyer au navigateur pour montrer une photo NETTE. À
 * n'appeler que là où la règle du site autorise la photo nette ; sinon
 * c'est /api/talents/photo (la copie floutée).
 */
export function photoNette(adresse: string | null | undefined): string | null {
  if (!adresse) return null;
  const chemin = cheminDeLaPhoto(adresse);
  // Une image qui n'est pas dans le dossier des photos : laissée telle quelle.
  if (!chemin) return adresse;
  return photoDuChemin(chemin);
}

/** La signature est-elle la bonne, et encore valable ? */
export function signatureValable(chemin: string, echeance: number, recue: string): boolean {
  if (!Number.isFinite(echeance) || echeance < Date.now() / 1000) return false;
  const attendue = signature(chemin, echeance);
  if (!attendue) return false;
  const a = Buffer.from(attendue);
  const b = Buffer.from(recue);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Le fichier lui-même, lu avec la clé du serveur (le dossier est fermé). */
export async function lirePhoto(chemin: string): Promise<{ donnees: Buffer; type: string } | null> {
  if (chemin.includes("..") || chemin.startsWith("/")) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.storage.from(DOSSIER).download(chemin);
  if (error || !data) return null;
  return { donnees: Buffer.from(await data.arrayBuffer()), type: data.type || "image/jpeg" };
}
