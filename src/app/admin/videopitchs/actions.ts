"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { promises as fs } from "node:fs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_MUSICPITCH, COLONNES, cheminAllege, numeroVimeo, prevenirRefuse, supprimerFichiers, type Depot } from "@/lib/videopitch";

async function adminConnecte() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!user || !isAdmin) redirect("/");
  const admin = createAdminClient();
  if (!admin) redirect("/admin/videopitchs?erreur=" + encodeURIComponent("Indisponible."));
  return { user, admin };
}

const retour = (message?: string): never =>
  redirect(message ? `/admin/videopitchs?erreur=${encodeURIComponent(message)}` : "/admin/videopitchs");

async function depotAValider(admin: NonNullable<ReturnType<typeof createAdminClient>>, id: string) {
  const { data } = await admin.from("videopitch_depots").select(COLONNES).eq("id", id).maybeSingle<Depot>();
  if (!data || data.etat !== "a_valider") retour("Ce StoryPitch n'est plus en attente.");
  return data as Depot;
}

/**
 * Valider : Sarah a déposé la vidéo sur Vimeo et colle le lien. Le numéro
 * va dans project_videopitchs (la fiche l'affiche aussitôt), le fichier
 * allégé est effacé, l'auteur est prévenu.
 */
export async function validerVideopitch(formData: FormData) {
  const { user, admin } = await adminConnecte();
  const id = String(formData.get("depot_id") ?? "");
  const numero = numeroVimeo(String(formData.get("lien") ?? ""));
  if (!numero) retour("Collez le lien Vimeo de la vidéo (vimeo.com/123456789).");
  const depot = await depotAValider(admin, id);

  // ComedyPitch (13/11) : le numéro reste sur le dépôt, qui devient le
  // ComedyPitch en ligne ; il remplace celui que ce comédien avait déjà
  // pour ce personnage. Pas d'e-mail à la mise en ligne.
  if (depot.genre === "comedypitch") {
    await admin
      .from("videopitch_depots")
      .delete()
      .eq("genre", "comedypitch")
      .eq("etat", "valide")
      .eq("personnage_id", depot.personnage_id as string)
      .eq("deposant_id", depot.deposant_id)
      .neq("id", id);
    const { error: echec } = await admin
      .from("videopitch_depots")
      .update({ etat: "valide", vimeo_id: numero, traite_le: new Date().toISOString(), traite_par: user.id, vu_par_auteur_le: null })
      .eq("id", id);
    if (echec) retour("Le lien n'a pas pu être enregistré : " + echec.message);
    await supprimerFichiers(id);
    revalidatePath(`/projet/${depot.project_id}`);
    revalidatePath("/admin/videopitchs");
    retour();
  }

  const colonne = depot.langue === "en" ? "videopitch_en" : "videopitch_fr";
  const { data: existant } = await admin
    .from("project_videopitchs")
    .select("videopitch_fr, videopitch_en")
    .eq("project_id", depot.project_id)
    .maybeSingle();
  const { error } = await admin.from("project_videopitchs").upsert(
    { project_id: depot.project_id, ...(existant ?? {}), [colonne]: numero },
    { onConflict: "project_id" },
  );
  if (error) retour("Le lien n'a pas pu être enregistré : " + error.message);

  await admin
    .from("videopitch_depots")
    .update({ etat: "valide", vimeo_id: numero, traite_le: new Date().toISOString(), traite_par: user.id })
    .eq("id", id);
  await supprimerFichiers(id);
  revalidatePath(`/projet/${depot.project_id}`);
  revalidatePath("/admin/videopitchs");
  retour();
}

/**
 * Mettre en ligne un MusicPitch (23/11, migration 0323) : pas de Vimeo. Le
 * MP3 préparé par le serveur est rangé dans le stockage du site, le dépôt
 * devient le MusicPitch en ligne et remplace celui que ce compositeur avait
 * déjà pour ce projet. Pas d'e-mail à la mise en ligne.
 */
export async function validerMusicpitch(formData: FormData) {
  const { user, admin } = await adminConnecte();
  const id = String(formData.get("depot_id") ?? "");
  const depot = await depotAValider(admin, id);
  if (depot.genre !== "musicpitch") retour("Ce dépôt n'est pas un MusicPitch.");

  let son: Buffer;
  try {
    son = await fs.readFile(cheminAllege(id, "musicpitch"));
  } catch {
    return retour("Le fichier son est introuvable sur le serveur.");
  }
  const { error: rangement } = await admin.storage
    .from(BUCKET_MUSICPITCH)
    .upload(`${id}.mp3`, son, { contentType: "audio/mpeg", upsert: true });
  if (rangement) retour("Le son n'a pas pu être rangé : " + rangement.message);

  const { data: remplaces } = await admin
    .from("videopitch_depots")
    .select("id")
    .eq("genre", "musicpitch")
    .eq("etat", "valide")
    .eq("project_id", depot.project_id)
    .eq("deposant_id", depot.deposant_id)
    .neq("id", id);
  const { error: echec } = await admin
    .from("videopitch_depots")
    .update({ etat: "valide", traite_le: new Date().toISOString(), traite_par: user.id, vu_par_auteur_le: null })
    .eq("id", id);
  if (echec) retour("Le MusicPitch n'a pas pu être mis en ligne : " + echec.message);
  if (remplaces?.length) {
    await admin.from("videopitch_depots").delete().in("id", remplaces.map((r) => r.id));
    await admin.storage.from(BUCKET_MUSICPITCH).remove(remplaces.map((r) => `${r.id}.mp3`));
  }
  await supprimerFichiers(id);
  revalidatePath(`/projet/${depot.project_id}`);
  revalidatePath("/admin/videopitchs");
  retour();
}

/** Refuser, avec un motif que l'auteur recevra tel quel. Le fichier est effacé. */
export async function refuserVideopitch(formData: FormData) {
  const { user, admin } = await adminConnecte();
  const id = String(formData.get("depot_id") ?? "");
  const motif = String(formData.get("motif") ?? "").trim();
  if (!motif) retour("Écrivez le motif du refus : l'auteur le recevra.");
  const depot = await depotAValider(admin, id);

  await admin
    .from("videopitch_depots")
    .update({ etat: "refuse", motif_refus: motif.slice(0, 1000), traite_le: new Date().toISOString(), traite_par: user.id })
    .eq("id", id);
  await supprimerFichiers(id);
  await prevenirRefuse(depot, motif);
  revalidatePath("/admin/videopitchs");
  retour();
}
