import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Télécharger la sauvegarde complète du site (18/10/2026, Sarah : copie
 * hebdomadaire sur son disque chiffré de 2 To).
 *
 * Le fichier est préparé chaque matin par scripts/preparer-sauvegarde.sh
 * (crontab de wfg) dans ~/sauvegarde-prete/ : la sauvegarde de la nuit, les
 * réglages du site et un LISEZMOI. Il est servi ici avec reprise possible
 * (en-têtes Range) : le premier essai de Sarah s'était coupé à 158 Mo sur
 * sa connexion, et sans reprise Firefox repartait de zéro. Avec la reprise,
 * « Réessayer » continue là où le téléchargement s'était arrêté.
 *
 * Administratrices seules ; une clé réservée au serveur (SAUVEGARDE_JETON)
 * permet de vérifier le téléchargement sans session.
 */
export const dynamic = "force-dynamic";

const DOSSIER = "/home/wfg/sauvegarde-prete";

export async function GET(req: Request) {
  const jeton = process.env.SAUVEGARDE_JETON;
  const parJeton = !!jeton && req.headers.get("authorization") === `Bearer ${jeton}`;
  const supabase = await createClient();
  if (!parJeton) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) return new Response("Accès réservé à l'administration.", { status: 403 });
  }

  let nom: string | undefined;
  try {
    nom = (await readdir(DOSSIER)).filter((n) => /^wefilmgood-sauvegarde-\d{8}\.tar$/.test(n)).sort().pop();
  } catch {}
  if (!nom) return new Response("La sauvegarde n'est pas encore prête. Réessayez dans une heure, ou prévenez Claude.", { status: 404 });

  const chemin = `${DOSSIER}/${nom}`;
  const info = await stat(chemin);
  const taille = info.size;
  const etag = `"${nom}-${taille}-${info.mtimeMs}"`;

  // Reprise : « bytes=debut-[fin] », seulement si c'est bien le même fichier.
  let debut = 0;
  let fin = taille - 1;
  const plage = req.headers.get("range");
  const memeFichier = !req.headers.get("if-range") || req.headers.get("if-range") === etag;
  const m = plage && memeFichier ? plage.match(/^bytes=(\d*)-(\d*)$/) : null;
  if (m && (m[1] || m[2])) {
    if (m[1]) {
      debut = Number(m[1]);
      if (m[2]) fin = Math.min(Number(m[2]), taille - 1);
    } else {
      debut = Math.max(0, taille - Number(m[2]));
    }
    if (debut > fin || debut >= taille) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${taille}` } });
    }
  }
  const partiel = debut > 0 || fin < taille - 1;

  // Un téléchargement noté seulement quand il commence au début.
  if (!parJeton && debut === 0) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await createAdminClient()?.from("telechargements_sauvegarde").insert({ sauvegarde: nom, par: user?.id ?? null });
  }

  const flux = createReadStream(chemin, { start: debut, end: fin });
  return new Response(Readable.toWeb(flux) as ReadableStream, {
    status: partiel ? 206 : 200,
    headers: {
      "Content-Type": "application/x-tar",
      "Content-Length": String(fin - debut + 1),
      "Content-Disposition": `attachment; filename="${nom}"`,
      "Accept-Ranges": "bytes",
      ETag: etag,
      "Last-Modified": info.mtime.toUTCString(),
      ...(partiel ? { "Content-Range": `bytes ${debut}-${fin}/${taille}` } : {}),
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
