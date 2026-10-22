import { promises as fs } from "node:fs";
import { createAdminClient } from "@/lib/supabase/admin";
import { TAILLE_MAX, TAILLE_MORCEAU, dossierDepot, extension, supprimerFichiers } from "@/lib/videopitch";
import { peutDeposer } from "../acces";

/**
 * Ouvre un dépôt : le navigateur annonce le fichier (nom, taille), le
 * serveur crée la ligne et le dossier, puis reçoit les morceaux (PUT
 * …/morceau) et enfin « terminer ». Un nouveau dépôt remplace celui qui
 * attendait encore pour la même langue.
 */
export async function POST(req: Request) {
  const corps = (await req.json().catch(() => null)) as
    | { project_id?: string; langue?: string; nom?: string; taille?: number; type?: string }
    | null;
  if (!corps?.project_id) return Response.json({ erreur: "Projet manquant." }, { status: 400 });

  const acces = await peutDeposer(corps.project_id);
  if (!acces) return Response.json({ erreur: "Vous ne pouvez pas déposer de videopitch sur ce projet." }, { status: 403 });
  const admin = createAdminClient();
  if (!admin) return Response.json({ erreur: "Indisponible." }, { status: 500 });

  const langue = corps.langue === "en" ? "en" : "fr";
  const taille = Number(corps.taille ?? 0);
  if (!extension(corps.nom)) {
    return Response.json({ erreur: "Ce format de vidéo n'est pas reconnu. Envoyez un MP4, MOV, AVI, MKV ou WEBM." }, { status: 400 });
  }
  if (!Number.isFinite(taille) || taille <= 0) return Response.json({ erreur: "Fichier vide." }, { status: 400 });
  if (taille > TAILLE_MAX) return Response.json({ erreur: "La vidéo dépasse 2 Go." }, { status: 400 });

  // Un seul dépôt en attente par projet et par langue : l'ancien s'efface.
  const { data: anciens } = await admin
    .from("videopitch_depots")
    .select("id")
    .eq("project_id", corps.project_id)
    .eq("langue", langue)
    .in("etat", ["envoi", "recu", "preparation", "a_valider", "refuse", "echec"]);
  for (const a of anciens ?? []) {
    await supprimerFichiers(a.id);
    await admin.from("videopitch_depots").delete().eq("id", a.id);
  }

  const { data: depot, error } = await admin
    .from("videopitch_depots")
    .insert({
      project_id: corps.project_id,
      deposant_id: acces.id,
      langue,
      nom_origine: (corps.nom ?? "video").slice(0, 200),
      type_origine: (corps.type ?? "").slice(0, 100) || null,
      taille_annoncee: taille,
    })
    .select("id")
    .single();
  if (error || !depot) return Response.json({ erreur: "Le dépôt n'a pas pu être ouvert." }, { status: 500 });

  await fs.mkdir(dossierDepot(depot.id), { recursive: true });
  return Response.json({ id: depot.id, morceau: TAILLE_MORCEAU });
}
