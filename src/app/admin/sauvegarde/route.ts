import { spawn } from "node:child_process";
import { access, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { FICHIERS_SAUVEGARDE, REGLAGES, derniereSauvegarde } from "@/lib/sauvegarde";

/**
 * Télécharger la dernière sauvegarde complète du site en un seul fichier
 * (18/10/2026, Sarah : copie hebdomadaire sur son disque de 2 To). Le
 * fichier .tar est fabriqué à la volée, sans copie sur le serveur (dont le
 * disque est compté) : la sauvegarde de la nuit, plus les réglages du site
 * qu'aucune sauvegarde ne contient, plus un LISEZMOI. Administratrices seules.
 */
export const dynamic = "force-dynamic";

const LISEZMOI = "/home/wfg/.sauvegarde-LISEZMOI.txt";

export async function GET() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return new Response("Accès réservé à l'administration.", { status: 403 });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const s = await derniereSauvegarde();
  if (!s) return new Response("Aucune sauvegarde trouvée sur le serveur.", { status: 404 });

  const reglages: { dossier: string; fichier: string }[] = [];
  for (const r of REGLAGES) {
    try {
      await access(`${r.dossier}/${r.fichier}`);
      reglages.push(r);
    } catch {}
  }
  await writeFile(
    LISEZMOI,
    [
      `Sauvegarde complète de WeFilmGood (app.wefilmgood.com), prise le ${s.date.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}.`,
      "",
      "postgres.sql.gz : toute la base de données (membres, projets, fiches de lecture, messages, ancienne base WFG 1).",
      "storage.tar.gz : tous les fichiers déposés (scénarios, images, photos, documents).",
      "config.tar.gz : la configuration de Supabase.",
      "SHA256SUMS : les empreintes pour vérifier que rien n'est abîmé.",
      "Réglages du site (clés secrètes, nginx, programme de sauvegarde) : " + reglages.map((r) => r.fichier).join(", ") + ".",
      "",
      "CE FICHIER CONTIENT LES DONNÉES PERSONNELLES DES MEMBRES ET LES CLÉS SECRÈTES DU SITE.",
      "À garder sur un disque chiffré, chez vous. Pour restaurer le site : demander à Claude.",
      "",
    ].join("\n"),
  );

  const args = ["-cf", "-", "-C", s.dossier, ...FICHIERS_SAUVEGARDE, "-C", "/home/wfg", ".sauvegarde-LISEZMOI.txt"];
  for (const r of reglages) args.push("-C", r.dossier, r.fichier);
  const tar = spawn("tar", args, { stdio: ["ignore", "pipe", "ignore"] });

  const admin = createAdminClient();
  await admin?.from("telechargements_sauvegarde").insert({ sauvegarde: s.nom, par: user?.id ?? null });

  const nom = `wefilmgood-sauvegarde-${s.nom.slice(0, 8)}.tar`;
  return new Response(Readable.toWeb(tar.stdout) as ReadableStream, {
    headers: {
      "Content-Type": "application/x-tar",
      "Content-Disposition": `attachment; filename="${nom}"`,
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
