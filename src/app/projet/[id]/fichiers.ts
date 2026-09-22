import type { SupabaseClient } from "@supabase/supabase-js";
import { alleger } from "@/lib/image";

/**
 * Les fichiers d'un projet, côté serveur : images (vignette, mood board,
 * portraits des personnages) dans « project-media », scénario dans
 * « scenarios ». Chaque envoi renvoie le chemin stocké, ou null s'il a
 * été refusé — l'appelant prévient alors l'auteur, au lieu de se taire.
 */
export const IMAGES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_MOODBOARD = 10;

const BUCKET_IMAGES = "project-media";

/** Dépose une image, allégée au passage, dans le dossier de l'auteur. */
export async function deposerImage(
  supabase: SupabaseClient,
  ownerId: string,
  projectId: string,
  fichier: File,
  etiquette: "vignette" | "moodboard" | "personnage",
): Promise<string | null> {
  // Allégée avant d'être stockée : les auteurs déposent des photos de
  // 15 à 20 Mo pour une image affichée à quelques centaines de pixels.
  const image = await alleger(fichier);
  const chemin = `${ownerId}/${projectId}-${etiquette}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await supabase.storage
    .from(BUCKET_IMAGES)
    .upload(chemin, image.donnees, { contentType: image.type });
  if (error) {
    console.error(`Dépôt d'image refusé (${etiquette}) :`, error.message);
    return null;
  }
  return chemin;
}

/** Retire des images du stockage. Un échec n'est pas bloquant : la fiche, elle, est déjà à jour. */
export async function retirerImages(supabase: SupabaseClient, chemins: string[]) {
  if (chemins.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET_IMAGES).remove(chemins);
  if (error) console.error("Retrait d'images refusé :", error.message);
}

/** Des adresses signées, valables une heure, pour afficher des images du stockage privé. */
export async function signerImages(
  supabase: SupabaseClient,
  chemins: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const liste = chemins.filter((c): c is string => Boolean(c));
  if (liste.length === 0) return new Map();
  const { data } = await supabase.storage.from(BUCKET_IMAGES).createSignedUrls(liste, 60 * 60);
  const paires: [string, string][] = [];
  for (const s of data ?? []) {
    if (s.path && s.signedUrl) paires.push([s.path, s.signedUrl]);
  }
  return new Map(paires);
}

/**
 * Dépose un scénario PDF et l'enregistre dans project_files. Renvoie
 * false si l'envoi a été refusé.
 */
export async function deposerScenario(
  supabase: SupabaseClient,
  ownerId: string,
  projectId: string,
  fichier: File,
): Promise<boolean> {
  const chemin = `${ownerId}/${Date.now()}-${fichier.name}`;
  const { error } = await supabase.storage
    .from("scenarios")
    .upload(chemin, fichier, { contentType: "application/pdf" });
  if (error) {
    console.error("Dépôt de scénario refusé :", error.message);
    return false;
  }
  const { error: ligne } = await supabase.from("project_files").insert({
    project_id: projectId,
    storage_path: chemin,
    kind: "scenario",
    original_name: fichier.name,
  });
  return !ligne;
}
