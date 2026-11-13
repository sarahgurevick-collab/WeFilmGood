import { createClient } from "@/lib/supabase/server";

/**
 * Les chiffres de l'accueil (13/11/2026, Sarah) : ceux de l'accueil de
 * WFG 1, recomptés dans WFG 2 par la fonction chiffres_accueil (migration
 * 0268). Le calcul prend près d'une seconde : il est gardé une heure en
 * mémoire, l'accueil n'attend pas dessus à chaque visite.
 */
export type ChiffresAccueil = {
  talents: number;
  metiers: Record<string, number>;
  fiches: number;
  labellises: number;
  pays: number;
  signes: number;
};

const DUREE = 60 * 60 * 1000;
let garde: { chiffres: ChiffresAccueil; a: number } | null = null;

export async function chiffresAccueil(): Promise<ChiffresAccueil | null> {
  if (garde && Date.now() - garde.a < DUREE) return garde.chiffres;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("chiffres_accueil");
  if (error || !data) {
    if (error) console.error("chiffres_accueil :", error.message);
    // Mieux vaut des chiffres d'il y a une heure que pas de chiffres.
    return garde?.chiffres ?? null;
  }
  garde = { chiffres: data as ChiffresAccueil, a: Date.now() };
  return garde.chiffres;
}
