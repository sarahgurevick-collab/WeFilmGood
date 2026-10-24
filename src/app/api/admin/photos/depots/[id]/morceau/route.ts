import { promises as fs } from "node:fs";
import { cheminZip, ecrireEtat, estAdmin, lireEtat } from "@/lib/photos-archives";

/** Un morceau du .zip, ajouté au bout du fichier (reprise possible après une coupure). */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await estAdmin())) return Response.json({ erreur: "Réservé à l'administration." }, { status: 403 });
  const { id } = await params;
  const depot = await lireEtat(id);
  if (!depot) return Response.json({ erreur: "Dépôt introuvable." }, { status: 404 });
  if (depot.etat !== "envoi") return Response.json({ erreur: "Cet envoi est terminé." }, { status: 409 });

  const decalage = Number(req.headers.get("x-decalage") ?? "-1");
  if (decalage !== depot.recu) return Response.json({ erreur: "Décalage inattendu.", recu: depot.recu }, { status: 409 });
  const donnees = Buffer.from(await req.arrayBuffer());
  if (donnees.length === 0) return Response.json({ erreur: "Morceau vide." }, { status: 400 });
  const total = depot.recu + donnees.length;
  if (total > depot.taille) return Response.json({ erreur: "Le fichier dépasse la taille annoncée." }, { status: 400 });

  await fs.appendFile(cheminZip(id), donnees);
  await ecrireEtat({ ...depot, recu: total });
  return Response.json({ recu: total });
}
