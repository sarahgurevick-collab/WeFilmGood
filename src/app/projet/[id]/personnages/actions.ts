"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PORTRAIT_Y_DEFAUT } from "@/lib/portrait";
import { chargerProjetAModifier } from "../../blocs";
import { IMAGES, deposerImage, retirerImages } from "../fichiers";
import { AGES, GENRES_PERSONNAGE, TYPES } from "./options";

const parmi = (liste: { value: string }[], valeur: FormDataEntryValue | null) => {
  const v = typeof valeur === "string" ? valeur : "";
  return liste.some((o) => o.value === v) ? v : null;
};

/** Bloc 3 — ajoute un personnage, ou enregistre celui dont l'identifiant est fourni. */
export async function enregistrerPersonnage(formData: FormData) {
  const id = formData.get("project_id") as string;
  const characterId = (formData.get("character_id") as string | null) || null;
  const { supabase, projet } = await chargerProjetAModifier(id, "personnages");

  const echec: (message: string) => never = (message) =>
    redirect(`/projet/${id}/personnages?erreur=${encodeURIComponent(message)}`);

  const name = (formData.get("name") as string)?.trim();
  if (!name) echec("Le nom du personnage est obligatoire.");

  const characterType = parmi(TYPES, formData.get("character_type"));
  const gender = parmi(GENRES_PERSONNAGE, formData.get("gender"));
  const ageRange = parmi(AGES, formData.get("age_range"));
  const biography = (formData.get("biography") as string)?.trim() || null;
  const actorName = (formData.get("actor_name") as string)?.trim() || null;
  const photo = formData.get("photo") as File | null;

  if (photo && photo.size > 0 && !IMAGES.includes(photo.type)) {
    echec("Le portrait doit être une image JPG ou PNG.");
  }

  // Le cadrage (06/10) : envoyé seulement si l'auteur a déplacé la photo.
  const nombre = (v: FormDataEntryValue | null) => {
    const n = typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : null;
  };
  const photoX = nombre(formData.get("photo_x"));
  const photoY = nombre(formData.get("photo_y"));
  const cadrage = photoX !== null && photoY !== null ? { photo_x: photoX, photo_y: photoY } : null;

  let photoPath: string | null = null;
  if (photo && photo.size > 0) {
    photoPath = await deposerImage(supabase, projet.owner_id, id, photo, "personnage");
    if (!photoPath) echec("Le portrait n'a pas pu être enregistré. Réessayez, ou écrivez-nous.");
  } else {
    // Un portrait choisi sur internet (28/09) : copié sur le site, allégé,
    // comme un portrait déposé — un lien extérieur pourrait mourir.
    const photoUrl = ((formData.get("photo_url") as string) ?? "").trim();
    if (/^https:\/\//.test(photoUrl)) {
      const fichier = await telechargerImage(photoUrl);
      if (!fichier) echec("Le portrait choisi n'a pas pu être récupéré. Essayez-en un autre.");
      photoPath = await deposerImage(supabase, projet.owner_id, id, fichier, "personnage");
      if (!photoPath) echec("Le portrait n'a pas pu être enregistré. Réessayez, ou écrivez-nous.");
    }
  }

  if (characterId) {
    const { data: ancien } = await supabase
      .from("characters")
      .select("photo_path")
      .eq("id", characterId)
      .eq("project_id", id)
      .maybeSingle<{ photo_path: string | null }>();

    const { error } = await supabase
      .from("characters")
      .update({
        name,
        character_type: characterType,
        gender,
        age_range: ageRange,
        biography,
        actor_name: actorName,
        // Un portrait choisi par l'auteur n'est plus « proposé par la plateforme » (0120).
        // La nouvelle photo repart du centre, sauf si l'auteur l'a déjà cadrée.
        ...(photoPath ? { photo_path: photoPath, photo_proposee: false, photo_x: 50, photo_y: PORTRAIT_Y_DEFAUT } : {}),
        // Cadrer seulement une photo ne change pas son origine : elle reste « proposée par WeFilmGood ».
        ...(cadrage ?? {}),
      })
      .eq("id", characterId)
      .eq("project_id", id);
    if (error) echec(error.message);

    if (photoPath && ancien?.photo_path) await retirerImages(supabase, [ancien.photo_path]);
  } else {
    const { count } = await supabase
      .from("characters")
      .select("id", { count: "exact", head: true })
      .eq("project_id", id);

    const { error } = await supabase.from("characters").insert({
      project_id: id,
      name,
      character_type: characterType,
      gender,
      age_range: ageRange,
      biography,
      actor_name: actorName,
      photo_path: photoPath,
      ...(cadrage ?? {}),
      position: count ?? 0,
    });
    if (error) echec(error.message);
  }

  revalidatePath(`/projet/${id}`);
  // On revient sur le cadre qu'on vient d'enregistrer, qui le confirme à côté de son bouton.
  redirect(
    characterId
      ? `/projet/${id}/personnages?enregistre=${characterId}#perso-${characterId}`
      : `/projet/${id}/personnages?enregistre=1`,
  );
}

/** Retire un personnage, et son portrait avec lui. */
export async function retirerPersonnage(formData: FormData) {
  const id = formData.get("project_id") as string;
  const characterId = formData.get("character_id") as string;
  const { supabase } = await chargerProjetAModifier(id, "personnages");

  const { data: personnage } = await supabase
    .from("characters")
    .select("id, photo_path")
    .eq("id", characterId)
    .eq("project_id", id)
    .maybeSingle<{ id: string; photo_path: string | null }>();

  if (personnage) {
    await supabase.from("characters").delete().eq("id", personnage.id);
    if (personnage.photo_path) await retirerImages(supabase, [personnage.photo_path]);
  }

  revalidatePath(`/projet/${id}`);
  redirect(`/projet/${id}/personnages`);
}

/** Récupère une image sur internet (portrait choisi), 15 Mo au plus. */
async function telechargerImage(url: string): Promise<File | null> {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "WeFilmGood/1.0 (https://app.wefilmgood.com)" },
      signal: AbortSignal.timeout(15000),
    });
    const type = r.headers.get("content-type")?.split(";")[0] ?? "";
    if (!r.ok || !IMAGES.includes(type)) return null;
    const donnees = await r.arrayBuffer();
    if (donnees.byteLength > 15 * 1024 * 1024) return null;
    return new File([donnees], "portrait", { type });
  } catch {
    return null;
  }
}
