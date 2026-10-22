import { rattrapage } from "@/lib/videopitch";

/**
 * Le rattrapage des videopitchs (crontab, toutes les 10 minutes, même
 * jeton que les autres rattrapages) : convertit ce qui attend, remet en
 * file ce qu'un redémarrage a interrompu, efface les envois abandonnés.
 */
export async function POST(req: Request) {
  const jeton = process.env.HELLOASSO_RATTRAPAGE_JETON;
  if (!jeton || req.headers.get("authorization") !== `Bearer ${jeton}`) {
    return new Response("Non autorisé", { status: 401 });
  }
  const resultat = await rattrapage();
  return Response.json({ ok: true, ...resultat });
}
