import "server-only";

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs, openSync } from "node:fs";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Les exports officiels Facebook des pages MdS et WeFilmGood, déposés par
 * Sarah depuis /admin/photos (24/10/2026). Le .zip arrive par morceaux de
 * 8 Mo dans ~/photos-facebook/depots/<id>/, puis le script
 * scripts/importer-photos-facebook.mjs range les photos dans le bucket
 * photos-archives (sauvegardé chaque nuit) et la table photos_archives.
 */

export const DOSSIER = process.env.PHOTOS_FACEBOOK_DIR ?? "/home/wfg/photos-facebook/depots";
export const TAILLE_MAX = 20 * 1024 * 1024 * 1024;
export const TAILLE_MORCEAU = 8 * 1024 * 1024;
export const BUCKET = "photos-archives";

export type Source = "mds" | "wefilmgood";
export const NOM_SOURCE: Record<Source, string> = { mds: "Maison des Scénaristes", wefilmgood: "WeFilmGood" };

export type EtatDepot = {
  id: string;
  source: Source;
  nom: string;
  taille: number;
  recu: number;
  etat: "envoi" | "recu" | "import" | "fini" | "echec";
  cree_le: string;
  total?: number;
  importees?: number;
  ignorees?: number;
  echecs?: number;
  erreur?: string | null;
};

export async function estAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}

const valide = (id: string) => /^[0-9a-f-]{36}$/.test(id);
const dossierDe = (id: string) => path.join(DOSSIER, id);
export const cheminZip = (id: string) => path.join(dossierDe(id), "export.zip");

export async function lireEtat(id: string): Promise<EtatDepot | null> {
  if (!valide(id)) return null;
  try {
    return JSON.parse(await fs.readFile(path.join(dossierDe(id), "etat.json"), "utf8")) as EtatDepot;
  } catch {
    return null;
  }
}

export async function ecrireEtat(e: EtatDepot) {
  await fs.writeFile(path.join(dossierDe(e.id), "etat.json"), JSON.stringify(e, null, 2));
}

export async function ouvrirDepot(source: Source, nom: string, taille: number): Promise<EtatDepot> {
  const id = randomUUID();
  await fs.mkdir(dossierDe(id), { recursive: true });
  const e: EtatDepot = { id, source, nom: nom.slice(0, 200), taille, recu: 0, etat: "envoi", cree_le: new Date().toISOString() };
  await ecrireEtat(e);
  return e;
}

export async function listerDepots(): Promise<EtatDepot[]> {
  let noms: string[] = [];
  try {
    noms = await fs.readdir(DOSSIER);
  } catch {
    return [];
  }
  const tous = await Promise.all(noms.map(lireEtat));
  return tous.filter((e): e is EtatDepot => !!e).sort((a, b) => b.cree_le.localeCompare(a.cree_le));
}

/** Lance le rangement des photos, détaché du site : il continue même si la page se ferme. */
export function lancerImport(id: string) {
  const racine = process.cwd();
  const journal = openSync(path.join(dossierDe(id), "import.log"), "a");
  const p = spawn(process.execPath, [path.join(racine, "scripts/importer-photos-facebook.mjs"), dossierDe(id)], {
    cwd: racine,
    detached: true,
    stdio: ["ignore", journal, journal],
  });
  p.unref();
}

/** Liens temporaires (1 h) vers les images du bucket, pour l'administration. */
export async function liensSignes(chemins: string[]) {
  const admin = createAdminClient();
  if (!admin || chemins.length === 0) return new Map<string, string>();
  const { data } = await admin.storage.from(BUCKET).createSignedUrls(chemins, 60 * 60);
  return new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl]));
}
