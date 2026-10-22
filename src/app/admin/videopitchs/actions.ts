"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { COLONNES, numeroVimeo, prevenirRefuse, prevenirValide, supprimerFichiers, type Depot } from "@/lib/videopitch";

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
  if (!data || data.etat !== "a_valider") retour("Ce videopitch n'est plus en attente.");
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
  await prevenirValide(depot);
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
