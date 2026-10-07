"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PORTRAIT_Y_DEFAUT } from "@/lib/portrait";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SEUIL_DESCRIPTION } from "./seuil";
import { IMAGES, deposerImage, retirerImages } from "@/app/projet/[id]/fichiers";

/**
 * L'administration, ou un aidant aux portraits (migration 0135) : il relit,
 * valide, retire et pose des photos, rien d'autre. Le suivi des portraits
 * n'est lisible qu'avec la clé de service.
 */
async function clientAidant() {
  const supabase = await createClient();
  const [{ data: admin }, { data: aidant }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("is_portrait_helper"),
  ]);
  if (admin !== true && aidant !== true) redirect("/");
  const a = createAdminClient();
  if (!a) redirect("/");
  return a;
}

/** Le cadrage d'une photo (en %), ou null s'il n'a pas été choisi. */
function cadrageDe(formData: FormData) {
  const nombre = (v: FormDataEntryValue | null) => {
    const n = typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : null;
  };
  const photo_x = nombre(formData.get("photo_x"));
  const photo_y = nombre(formData.get("photo_y"));
  return photo_x !== null && photo_y !== null ? { photo_x, photo_y } : null;
}

/** « Enregistrer le cadrage » : seule la partie visible change, la photo reste entière. */
export async function cadrerPortrait(formData: FormData) {
  const id = String(formData.get("character_id") ?? "");
  const cadrage = cadrageDe(formData);
  if (!id || !cadrage) return;
  const a = await clientAidant();
  await a.from("characters").update(cadrage).eq("id", id).eq("photo_proposee", true);
  revalidatePath("/admin/portraits");
}

/** « Valider » : le portrait moyen est bon, il quitte la liste à relire. */
export async function validerPortrait(formData: FormData) {
  const id = String(formData.get("character_id") ?? "");
  if (!id) return;
  const a = await clientAidant();
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
  const a = await clientAidant();
  const { data: perso } = await a
    .from("characters")
    .select("photo_path")
    .eq("id", id)
    .eq("photo_proposee", true)
    .maybeSingle<{ photo_path: string | null }>();
  if (!perso) return;

  await a
    .from("characters")
    .update({ photo_path: null, photo_proposee: false, photo_x: 50, photo_y: PORTRAIT_Y_DEFAUT })
    .eq("id", id)
    .eq("photo_proposee", true);
  await a
    .from("portraits_suivi")
    .update({ avis: "rien", note: "Retiré par l’équipe" })
    .eq("character_id", id);
  if (perso.photo_path) await retirerImages(a, [perso.photo_path]);
  revalidatePath("/admin/portraits");
}

/**
 * « Poser cette photo » : la photo choisie à la main (Unsplash, Adobe Stock…)
 * est déposée sur un personnage qui n'en a pas. Elle compte comme « proposée
 * par WeFilmGood » : l'auteur peut la remplacer quand il veut. Un personnage
 * qui a déjà une photo n'est jamais écrasé.
 */
export async function poserPhoto(formData: FormData) {
  const id = String(formData.get("character_id") ?? "");
  const photo = formData.get("photo") as File | null;
  const retour = (m?: string) =>
    redirect(`/admin/portraits?avis=sans${m ? `&erreur=${encodeURIComponent(m)}` : ""}`);
  if (!id || !photo || photo.size === 0) retour("Choisissez d’abord une photo.");
  if (!IMAGES.includes(photo!.type)) retour("La photo doit être une image JPG, PNG ou WebP.");

  const a = await clientAidant();
  const { data: perso } = await a
    .from("characters")
    .select("id, photo_path, project_id, project:projects(owner_id)")
    .eq("id", id)
    .maybeSingle<{ id: string; photo_path: string | null; project_id: string; project: { owner_id: string } | null }>();
  if (!perso || !perso.project) retour("Ce personnage n’existe plus.");
  if (perso!.photo_path) {
    revalidatePath("/admin/portraits");
    retour("Ce personnage a déjà une photo.");
  }

  const chemin = await deposerImage(a, perso!.project!.owner_id, perso!.project_id, photo!, "personnage");
  if (!chemin) retour("La photo n’a pas pu être enregistrée. Réessayez avec une autre image.");

  const { error } = await a
    .from("characters")
    .update({ photo_path: chemin, photo_proposee: true, photo_x: 50, photo_y: PORTRAIT_Y_DEFAUT, ...(cadrageDe(formData) ?? {}) })
    .eq("id", id)
    .is("photo_path", null);
  if (error) {
    await retirerImages(a, [chemin!]);
    retour("La photo n’a pas pu être enregistrée. Réessayez.");
  }

  const jour = new Date().toISOString().slice(0, 10);
  await a
    .from("portraits_suivi")
    .upsert({ character_id: id, lot: `manuel-${jour}`, avis: "bon", note: "Posée à la main", source: "manuel" });
  revalidatePath("/admin/portraits");
  retour();
}

/**
 * « Supprimer » les personnages secondaires sans description cochés (07/10,
 * demande de Sarah). Réservé à l'administration. Chaque ligne est gardée dans
 * personnages_supprimes avant d'être effacée ; on revérifie ici qu'elle est
 * toujours secondaire, sans photo et sans description (l'auteur a pu la
 * compléter depuis l'affichage de la liste).
 */
export async function supprimerPersonnages(formData: FormData) {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin !== true) redirect("/");
  const a = createAdminClient();
  if (!a) redirect("/");

  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) return;

  const { data: lignes } = await a
    .from("characters")
    .select("*")
    .in("id", ids)
    .eq("character_type", "secondaire")
    .is("photo_path", null)
    .returns<{ id: string; biography: string | null }[]>();
  const aSupprimer = (lignes ?? []).filter((l) => (l.biography ?? "").trim().length < SEUIL_DESCRIPTION);
  if (aSupprimer.length === 0) return;

  const { error } = await a.from("personnages_supprimes").insert(aSupprimer.map((l) => ({ personnage: l })));
  if (error) redirect("/admin/portraits?avis=secondaires&erreur=" + encodeURIComponent("La sauvegarde a échoué, rien n’a été supprimé."));
  await a.from("characters").delete().in("id", aSupprimer.map((l) => l.id));
  revalidatePath("/admin/portraits");
}
