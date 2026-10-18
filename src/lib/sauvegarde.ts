import "server-only";

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * La sauvegarde complète du site, prise chaque nuit vers 5 h (heure de Paris)
 * par /usr/local/sbin/supabase-backup dans /srv/backups/supabase/<date>/ :
 * la base (postgres.sql.gz), les fichiers déposés (storage.tar.gz) et la
 * configuration de Supabase (config.tar.gz). 7 copies gardées.
 */
export const DOSSIER_SAUVEGARDES = "/srv/backups/supabase";
export const FICHIERS_SAUVEGARDE = ["postgres.sql.gz", "storage.tar.gz", "config.tar.gz", "SHA256SUMS"];

/** Les réglages du site qui ne sont dans aucune sauvegarde (clés, nginx, programme de sauvegarde). */
export const REGLAGES = [
  { dossier: "/home/wfg/projects/wefilmgood", fichier: ".env.local" },
  { dossier: "/etc/nginx/conf.d", fichier: "wefilmgood-tampons.conf" },
  { dossier: "/usr/local/sbin", fichier: "supabase-backup" },
  { dossier: "/etc/systemd/system", fichier: "supabase-backup.timer" },
];

export async function derniereSauvegarde(): Promise<{ nom: string; dossier: string; date: Date; taille: number } | null> {
  try {
    const noms = (await readdir(DOSSIER_SAUVEGARDES)).filter((n) => /^\d{8}T\d{6}Z$/.test(n)).sort();
    const nom = noms.pop();
    if (!nom) return null;
    const dossier = join(DOSSIER_SAUVEGARDES, nom);
    let taille = 0;
    for (const f of FICHIERS_SAUVEGARDE) taille += (await stat(join(dossier, f))).size;
    const date = new Date(`${nom.slice(0, 4)}-${nom.slice(4, 6)}-${nom.slice(6, 8)}T${nom.slice(9, 11)}:${nom.slice(11, 13)}:${nom.slice(13, 15)}Z`);
    return { nom, dossier, date, taille };
  } catch {
    return null;
  }
}
