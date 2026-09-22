import { rattraperAdhesions } from "@/lib/adhesion-paiement";

/**
 * Le rattrapage horaire : appelé toutes les heures par le serveur
 * (crontab de l'utilisateur wfg), au cas où une notification de
 * HelloAsso se serait perdue. Protégé par un jeton.
 */
export async function POST(request: Request) {
  const attendu = process.env.HELLOASSO_RATTRAPAGE_JETON;
  if (!attendu || request.headers.get("authorization") !== `Bearer ${attendu}`) {
    return Response.json({ erreur: "refusé" }, { status: 401 });
  }
  return Response.json(await rattraperAdhesions());
}
