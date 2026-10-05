"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** À qui la facture est adressée : la base ne laisse écrire que sur ses propres factures. */
export async function renseignerFacture(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const facture = formData.get("facture_id") as string;
  if (!user || !facture) redirect("/adhesion");

  await supabase.rpc("renseigner_facture_adhesion", {
    p_facture: facture,
    p_nom: (formData.get("nom") as string) ?? "",
    p_adresse: (formData.get("adresse") as string) ?? "",
    p_siren: (formData.get("siren") as string) ?? "",
    p_note: (formData.get("note") as string) ?? "",
  });

  revalidatePath(`/adhesion/facture/${facture}`);
}
