"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Marque payées, d'un coup, les fiches cochées sur la fiche d'un lecteur. */
export async function marquerPayees(formData: FormData) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const lecteur = formData.get("lecteur") as string;
  const ids = formData.getAll("fiche").map(String).filter(Boolean);

  if (ids.length) {
    await supabase
      .from("reading_reports")
      .update({ payment_status: "payee", paid_at: new Date().toISOString() })
      .in("id", ids)
      .eq("reader_id", lecteur);
  }

  revalidatePath(`/admin/lecteurs/${lecteur}`);
  redirect(`/admin/lecteurs/${lecteur}`);
}
