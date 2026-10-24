"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { filtrerCommentaire } from "@/lib/cinecrush-filtre";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Un avis sous le CinéCrush de la semaine (24/10/2026, Sarah) : tout membre
 * connecté, gratuit, publié tout de suite — sauf si le filtre IA, quand il
 * est allumé, le met de côté pour l'administration. Une réponse se pose
 * sous un commentaire (parent_id) : l'auteur du projet, ou un membre.
 */
export async function commenterCineCrush(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/cinecrush");

  const cinecrushId = ((formData.get("cinecrush_id") as string) ?? "").trim();
  const parentId = ((formData.get("parent_id") as string) ?? "").trim() || null;
  const contenu = ((formData.get("contenu") as string) ?? "").trim().slice(0, 2000);
  if (!cinecrushId || !contenu) redirect("/cinecrush?erreur=vide#commentaires");

  // Le filtre : allumé par défaut, l'administration peut l'éteindre.
  const admin = createAdminClient();
  const { data: reglage } = admin
    ? await admin.from("cinecrush_reglages").select("valeur").eq("cle", "filtre_ia").maybeSingle<{ valeur: boolean }>()
    : { data: null };
  const filtre = reglage?.valeur ?? true;
  const verdict = filtre ? await filtrerCommentaire(contenu) : { ok: true as const };

  const { error } = await supabase.from("cinecrush_commentaires").insert({
    cinecrush_id: cinecrushId,
    auteur_id: user.id,
    parent_id: parentId,
    contenu,
    statut: verdict.ok ? "publie" : "en_attente",
    motif_ia: verdict.ok ? null : verdict.motif,
  });
  if (error) redirect("/cinecrush?erreur=semaine#commentaires");

  revalidatePath("/cinecrush");
  revalidatePath("/admin/cinecrush");
  redirect(verdict.ok ? "/cinecrush#commentaires" : "/cinecrush?attente=1#commentaires");
}

/** Retirer son propre commentaire. */
export async function retirerMonCommentaire(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/cinecrush");
  const id = ((formData.get("id") as string) ?? "").trim();
  if (id) {
    await supabase.from("cinecrush_commentaires").update({ statut: "retire" }).eq("id", id).eq("auteur_id", user.id);
  }
  revalidatePath("/cinecrush");
  redirect("/cinecrush#commentaires");
}
