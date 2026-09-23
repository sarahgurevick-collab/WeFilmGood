"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Une facture de lecteur réglée : toutes ses fiches passent en « payée »
 * d'un coup. C'est le lecteur qui a choisi les fiches en établissant sa
 * facture ; l'administration n'a plus qu'à confirmer le paiement.
 */
export async function payerFacture(formData: FormData) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const facture = formData.get("facture") as string;
  const retour = (formData.get("retour") as string) || "/admin/lecteurs";

  await supabase
    .from("reading_reports")
    .update({ payment_status: "payee", paid_at: new Date().toISOString() })
    .eq("invoice_id", facture)
    .eq("payment_status", "due");

  revalidatePath("/admin/lecteurs", "layout");
  redirect(retour.startsWith("/admin/lecteurs") ? retour : "/admin/lecteurs");
}
