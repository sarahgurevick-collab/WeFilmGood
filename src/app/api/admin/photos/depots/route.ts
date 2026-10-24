import { TAILLE_MAX, TAILLE_MORCEAU, estAdmin, listerDepots, ouvrirDepot } from "@/lib/photos-archives";

/** Ouvre le dépôt d'un export Facebook (.zip) : l'administration seule. */
export async function POST(req: Request) {
  if (!(await estAdmin())) return Response.json({ erreur: "Réservé à l'administration." }, { status: 403 });
  const corps = (await req.json().catch(() => null)) as { source?: string; nom?: string; taille?: number } | null;
  const source = corps?.source === "wefilmgood" ? "wefilmgood" : corps?.source === "mds" ? "mds" : null;
  if (!source) return Response.json({ erreur: "Choisissez la page Facebook." }, { status: 400 });
  if (!(corps?.nom ?? "").toLowerCase().endsWith(".zip")) {
    return Response.json({ erreur: "Le fichier de Facebook se termine par .zip." }, { status: 400 });
  }
  const taille = Number(corps?.taille ?? 0);
  if (!Number.isFinite(taille) || taille <= 0 || taille > TAILLE_MAX) {
    return Response.json({ erreur: "Taille de fichier inattendue." }, { status: 400 });
  }
  const depot = await ouvrirDepot(source, corps!.nom!, taille);
  return Response.json({ id: depot.id, morceau: TAILLE_MORCEAU });
}

/** L'avancée des dépôts, relue par la page pendant le rangement. */
export async function GET() {
  if (!(await estAdmin())) return Response.json({ erreur: "Réservé à l'administration." }, { status: 403 });
  return Response.json({ depots: await listerDepots() });
}
