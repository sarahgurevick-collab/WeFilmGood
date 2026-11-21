import { rattraperAdhesions, suivrePrelevements } from "@/lib/adhesion-paiement";
import { rattraperDemandesLecture } from "@/lib/lecture-paiement";
import { rattraperAchatsSoleils } from "@/lib/soleils-paiement";

/**
 * Le rattrapage horaire : appelé toutes les heures par le serveur
 * (crontab de l'utilisateur wfg), au cas où une notification de
 * HelloAsso se serait perdue. Protégé par un jeton. Il revérifie les
 * adhésions et les lectures en attente de paiement, et suit les
 * prélèvements des adhésions au mois (21/11).
 */
export async function POST(request: Request) {
  const attendu = process.env.HELLOASSO_RATTRAPAGE_JETON;
  if (!attendu || request.headers.get("authorization") !== `Bearer ${attendu}`) {
    return Response.json({ erreur: "refusé" }, { status: 401 });
  }
  const adhesions = await rattraperAdhesions();
  const lectures = await rattraperDemandesLecture();
  const soleils = await rattraperAchatsSoleils();
  const prelevements = await suivrePrelevements();
  return Response.json({ ...adhesions, lectures, soleils, prelevements });
}
