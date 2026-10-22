import { promises as fs } from "node:fs";
import { TAILLE_MAX, cheminOrigine, extension } from "@/lib/videopitch";
import { depotDe } from "../../../acces";

/**
 * Un morceau de la vidéo, ajouté au bout du fichier. Le navigateur dit
 * à quel octet il commence (x-decalage) : s'il ne tombe pas sur la fin du
 * fichier, le serveur renvoie où il en est et le navigateur reprend de là.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acces = await depotDe(id);
  if (!acces) return Response.json({ erreur: "Dépôt introuvable." }, { status: 404 });
  const { depot, admin } = acces;
  if (depot.etat !== "envoi") return Response.json({ erreur: "Cet envoi est terminé." }, { status: 409 });

  const decalage = Number(req.headers.get("x-decalage") ?? "-1");
  if (decalage !== depot.taille_recue) {
    return Response.json({ erreur: "Décalage inattendu.", recu: depot.taille_recue }, { status: 409 });
  }
  const donnees = Buffer.from(await req.arrayBuffer());
  if (donnees.length === 0) return Response.json({ erreur: "Morceau vide." }, { status: 400 });
  const total = depot.taille_recue + donnees.length;
  if (total > depot.taille_annoncee || total > TAILLE_MAX) {
    return Response.json({ erreur: "La vidéo dépasse la taille annoncée." }, { status: 400 });
  }

  const chemin = cheminOrigine(id, extension(depot.nom_origine) ?? "mp4");
  await fs.appendFile(chemin, donnees);
  await admin.from("videopitch_depots").update({ taille_recue: total }).eq("id", id);
  return Response.json({ recu: total });
}
