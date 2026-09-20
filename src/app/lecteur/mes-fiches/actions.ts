"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Établit une facture à partir des fiches cochées.
 *
 * La base ne retient que les fiches du lecteur, validées et non encore
 * facturées : une fiche déjà réglée ne peut pas se glisser une seconde
 * fois dans une facture, même en forçant la requête.
 */
export async function etablirFacture(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/lecteur/mes-fiches");

  const choisies = formData.getAll("report_id").map(String).filter(Boolean);
  if (choisies.length === 0) {
    redirect("/lecteur/mes-fiches?erreur=aucune");
  }

  const { data: facture } = await supabase.rpc("etablir_facture", {
    p_reports: choisies,
  });

  if (!facture) redirect("/lecteur/mes-fiches?erreur=impossible");
  redirect(`/lecteur/factures/${facture}`);
}
