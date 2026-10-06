"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { retirerImages } from "@/app/projet/[id]/fichiers";

/** Réservé à l'administration ; le suivi des portraits n'est lisible qu'avec la clé de service. */
async function clientAdmin() {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin !== true) redirect("/");
  const a = createAdminClient();
  if (!a) redirect("/admin");
  return a;
}

/** « Valider » : le portrait moyen est bon, il quitte la liste à relire. */
export async function validerPortrait(formData: FormData) {
  const id = String(formData.get("character_id") ?? "");
  if (!id) return;
  const a = await clientAdmin();
  await a.from("portraits_suivi").update({ avis: "bon", note: null }).eq("character_id", id);
  revalidatePath("/admin/portraits");
}

/**
 * « Retirer » : la photo posée par WeFilmGood est enlevée du personnage et
 * du stockage. Une photo choisie par l'auteur n'est jamais touchée.
 */
export async function retirerPortrait(formData: FormData) {
  const id = String(formData.get("character_id") ?? "");
  if (!id) return;
  const a = await clientAdmin();
  const { data: perso } = await a
    .from("characters")
    .select("photo_path")
    .eq("id", id)
    .eq("photo_proposee", true)
    .maybeSingle<{ photo_path: string | null }>();
  if (!perso) return;

  await a
    .from("characters")
    .update({ photo_path: null, photo_proposee: false, photo_x: 50, photo_y: 50 })
    .eq("id", id)
    .eq("photo_proposee", true);
  await a
    .from("portraits_suivi")
    .update({ avis: "rien", note: "Retiré par l’équipe" })
    .eq("character_id", id);
  if (perso.photo_path) await retirerImages(a, [perso.photo_path]);
  revalidatePath("/admin/portraits");
}
