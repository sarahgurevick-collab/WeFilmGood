import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Le passage de nuit des matchs entre projets (crontab, même jeton que le
 * rattrapage HelloAsso) : chaque projet dont l'auteur a rempli ses trois
 * thèmes de mots-clés retrouve son projet le plus proche. Un match qui
 * change redevient « pas encore vu » pour l'auteur (Sarah, 23/11/2026).
 */
export const maxDuration = 3600;

export async function POST(req: Request) {
  const jeton = process.env.HELLOASSO_RATTRAPAGE_JETON;
  if (!jeton || req.headers.get("authorization") !== `Bearer ${jeton}`) {
    return new Response("Non autorisé", { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return Response.json({ ok: false }, { status: 500 });
  const { data, error } = await admin.rpc("calculer_tous_les_matchs");
  if (error) return Response.json({ ok: false, erreur: error.message }, { status: 500 });
  return Response.json({ ok: true, projets: data });
}
