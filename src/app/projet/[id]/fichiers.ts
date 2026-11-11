import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { alleger } from "@/lib/image";

/**
 * Les fichiers d'un projet, côté serveur : images (vignette, mood board,
 * portraits des personnages) dans « project-media », scénario dans
 * « scenarios ». Chaque envoi renvoie le chemin stocké, ou null s'il a
 * été refusé — l'appelant prévient alors l'auteur, au lieu de se taire.
 */
export const IMAGES = ["image/jpeg", "image/png", "image/webp"];
// Neuf photos (03/10, Sarah) : trois rangées de trois dans le cadre du moodboard.

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
  // Le nouveau scénario écrase l'ancien (06/11, Sarah) : avant, il
  // s'ajoutait à côté, et certaines pages (lecteurs, file d'attente)
  // ouvraient encore l'ancien.
  const { data: anciens } = await supabase
    .from("project_files")
    .select("id, storage_path")
    .eq("project_id", projectId)
    .eq("kind", "scenario")
    .returns<{ id: string; storage_path: string }[]>();
  const { error: ligne } = await supabase.from("project_files").insert({
    project_id: projectId,
    storage_path: chemin,
    kind: "scenario",
    original_name: fichier.name,
  });
  if (ligne) return false;
  if (anciens?.length) {
    await supabase.from("project_files").delete().in("id", anciens.map((a) => a.id));
    // L'auteur n'a plus la main sur le fichier d'un projet déjà envoyé
    // (0254) : c'est le serveur qui efface l'ancienne version, pour qu'elle
    // ne reste pas (11/11, Sarah : elle « est destinée à être écrasée »).
    const effaceur = createAdminClient() ?? supabase;
    await effaceur.storage.from("scenarios").remove(anciens.map((a) => a.storage_path));
  }
  return true;
}

/**
 * Recadre une image stockée en 16/9, en gardant la partie choisie (x et y
 * en %, 50 = au centre), et la dépose. Renvoie le chemin de la copie
 * recadrée, ou null en cas d'échec. Une image déjà en 16/9 est recopiée telle quelle.
 */
export async function recadrerEn16x9(
  supabase: SupabaseClient,
  ownerId: string,
  projectId: string,
  source: string,
  x: number,
  y: number,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET_IMAGES).download(source);
  if (error || !data) return null;
  try {
    const origine = Buffer.from(await data.arrayBuffer());
    const image = sharp(origine, { failOn: "none" }).rotate();
    const { width = 0, height = 0 } = await sharp(await image.clone().toBuffer()).metadata();
    if (!width || !height) return null;
    let largeur = width;
    let hauteur = height;
    if (width / height > 16 / 9) largeur = Math.round((height * 16) / 9);
    else hauteur = Math.round((width * 9) / 16);
    const gauche = Math.round((width - largeur) * (Math.min(100, Math.max(0, x)) / 100));
    const haut = Math.round((height - hauteur) * (Math.min(100, Math.max(0, y)) / 100));
    const rogne = await image
      .extract({ left: gauche, top: haut, width: largeur, height: hauteur })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    const chemin = `${ownerId}/${projectId}-vignette-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { error: depot } = await supabase.storage
      .from(BUCKET_IMAGES)
      .upload(chemin, rogne, { contentType: "image/jpeg" });
    if (depot) {
      console.error("Dépôt de la vignette recadrée refusé :", depot.message);
      return null;
    }
    return chemin;
  } catch (e) {
    console.error("Recadrage de la vignette en échec :", e);
    return null;
  }
}
