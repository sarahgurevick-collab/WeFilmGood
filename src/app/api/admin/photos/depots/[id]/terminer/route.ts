import { ecrireEtat, estAdmin, lancerImport, lireEtat } from "@/lib/photos-archives";

/** Tout le .zip est arrivé : le rangement des photos démarre. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await estAdmin())) return Response.json({ erreur: "Réservé à l'administration." }, { status: 403 });
  const { id } = await params;
  const depot = await lireEtat(id);
  if (!depot) return Response.json({ erreur: "Dépôt introuvable." }, { status: 404 });
  if (depot.etat !== "envoi") return Response.json({ etat: depot.etat });
  if (depot.recu !== depot.taille) return Response.json({ erreur: "Il manque une partie du fichier.", recu: depot.recu }, { status: 409 });
  await ecrireEtat({ ...depot, etat: "recu" });
  lancerImport(id);
  return Response.json({ etat: "recu" });
}
