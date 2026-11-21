"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Le complément libre que le lecteur ajoute à sa facture.
 *
 * La base ne laisse écrire que sur ses propres factures.
 */
export async function noterFacture(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const facture = formData.get("facture_id") as string;
  if (!user || !facture) redirect("/lecteur/mes-fiches");

  await supabase.rpc("noter_facture", {
    p_facture: facture,
    p_note: (formData.get("note") as string) ?? "",
  });

  revalidatePath(`/lecteur/factures/${facture}`);
}

/**
 * « Facture lecture » ou « Note d'honoraires lecture » : le lecteur
 * choisit le titre de son document (21/11/2026). La base ne laisse
 * écrire que sur ses propres documents.
 */
export async function choisirTypeFacture(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const facture = formData.get("facture_id") as string;
  const type = formData.get("type") as string;
  if (!user || !facture) redirect("/lecteur/mes-fiches");
  if (type !== "facture" && type !== "note_honoraires") return;

  await supabase.rpc("choisir_type_facture", { p_facture: facture, p_type: type });

  revalidatePath(`/lecteur/factures/${facture}`);
}
