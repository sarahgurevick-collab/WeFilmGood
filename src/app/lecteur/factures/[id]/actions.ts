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
