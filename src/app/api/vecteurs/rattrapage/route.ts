import { createAdminClient } from "@/lib/supabase/admin";
import { enTexte, vecteurs } from "@/lib/vecteurs";

/**
 * Le rattrapage horaire des vecteurs de sens (crontab, comme celui de
 * HelloAsso) : les mots-clés apparus depuis reçoivent leur vecteur. Sans
 * ça, un nouveau mot-clé ne serait pas trouvé par le sens.
 */
export async function POST(req: Request) {
  const jeton = process.env.HELLOASSO_RATTRAPAGE_JETON;
  if (!jeton || req.headers.get("authorization") !== `Bearer ${jeton}`) {
    return new Response("Non autorisé", { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return Response.json({ ok: false }, { status: 500 });

  let faits = 0;
  for (let tour = 0; tour < 20; tour++) {
    const { data: lot } = await admin.rpc("mots_cles_sans_vecteur", { p_limite: 100 });
    const mots = (lot ?? []) as { id: number; label_fr: string }[];
    if (mots.length === 0) break;
    const vs = await vecteurs(mots.map((m) => m.label_fr));
    for (let i = 0; i < mots.length; i++) {
      await admin.from("keywords").update({ vecteur: enTexte(vs[i]) }).eq("id", mots[i].id);
    }
    faits += mots.length;
  }
  return Response.json({ ok: true, vectorises: faits });
}
