import type { SupabaseClient } from "@supabase/supabase-js";
import { PRIX_LECTURE_ADHERENT_CENTIMES, PRIX_LECTURE_CENTIMES } from "@/lib/lecture-paiement";

/**
 * La phrase qui rappelle à un auteur qu'il est adhérent, et que la lecture
 * lui coûte donc moins cher (27/11, Sarah : beaucoup d'adhésions ont été
 * offertes pour démarrer, et rien ne le disait à l'auteur). Affichée sur
 * l'écran d'envoi du scénario et en haut de la page Adhésion.
 *
 * « annuel·le » quand l'adhésion court sur un an (quelle que soit sa formule) ;
 * rien quand la personne n'a pas d'adhésion en cours, ou qu'on n'a pas le
 * droit de la lire (seuls le titulaire et l'administration la voient).
 */
export async function phraseAdherent(supabase: SupabaseClient, profileId: string): Promise<string | null> {
  const { data } = await supabase
    .from("memberships")
    .select("started_at, expires_at")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .order("expires_at", { ascending: false, nullsFirst: true })
    .limit(1)
    .maybeSingle<{ started_at: string | null; expires_at: string | null }>();
  if (!data) return null;

  const fin = data.expires_at ? new Date(data.expires_at) : null;
  if (fin && fin.getTime() <= Date.now()) return null;

  const debut = data.started_at ? new Date(data.started_at) : null;
  const jours = fin && debut ? (fin.getTime() - debut.getTime()) / 86_400_000 : 0;
  const annuelle = jours >= 300;

  const jusquAu = fin
    ? ` jusqu’au ${fin.toLocaleDateString("fr-FR", {
        timeZone: "Europe/Paris",
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`
    : "";
  const prix = (centimes: number) => `${centimes / 100} €`;
  return `Vous êtes adhérent·e${annuelle ? " annuel·le" : ""}${jusquAu} : la lecture de votre scénario est à ${prix(
    PRIX_LECTURE_ADHERENT_CENTIMES
  )} au lieu de ${prix(PRIX_LECTURE_CENTIMES)}.`;
}
