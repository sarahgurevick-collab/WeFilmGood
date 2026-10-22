import { lancerConversion } from "@/lib/videopitch";
import { depotDe } from "../../../acces";

/** Tous les morceaux sont là : le dépôt passe « reçu » et la conversion démarre. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acces = await depotDe(id);
  if (!acces) return Response.json({ erreur: "Dépôt introuvable." }, { status: 404 });
  const { depot, admin } = acces;
  if (depot.etat !== "envoi") return Response.json({ etat: depot.etat });
  if (depot.taille_recue !== depot.taille_annoncee) {
    return Response.json({ erreur: "Il manque une partie de la vidéo.", recu: depot.taille_recue }, { status: 409 });
  }
  await admin
    .from("videopitch_depots")
    .update({ etat: "recu", recu_le: new Date().toISOString() })
    .eq("id", id)
    .eq("etat", "envoi");
  lancerConversion(id);
  return Response.json({ etat: "recu" });
}
