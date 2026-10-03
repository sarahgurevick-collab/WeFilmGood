"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Crée le lien de partage, ou le révoque — ce qui referme l'accès aux destinataires précédents. */
export async function setShareLink(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projectId = formData.get("project_id") as string;
  const actif = formData.get("actif") === "1";

  if (!user) {
    redirect(`/connexion?next=/projet/${projectId}`);
  }

  await supabase.rpc("set_project_share_token", {
    p_project_id: projectId,
    p_actif: actif,
  });

  revalidatePath(`/projet/${projectId}`);
}

/** Le bandeau d'un projet (Optionné, Signé, Tourné…) : l'administration seule. */
export async function choisirBandeau(formData: FormData) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  const projectId = formData.get("project_id") as string;
  if (!isAdmin) redirect(`/projet/${projectId}`);
  const valeur = (formData.get("bandeau") as string) || null;
  const permis = ["signe", "tourne", "script_prime", "film_prime"];
  if (valeur && !permis.includes(valeur)) redirect(`/projet/${projectId}`);
  await supabase.from("projects").update({ bandeau: valeur }).eq("id", projectId);
  revalidatePath(`/projet/${projectId}`);
  revalidatePath("/pitchotheque");
  revalidatePath("/admin/fiches");
  const retour = (formData.get("retour") as string) || "";
  redirect(retour.startsWith("/admin/fiches") ? retour : `/projet/${projectId}`);
}

/**
 * Qui peut voir ce projet (27/09) : le porteur, s'il est adhérent, coche
 * les métiers qui y ont accès. Tout coché = visible de tous (NULL).
 */
export async function choisirVisibilite(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const projectId = formData.get("project_id") as string;
  if (!user) redirect(`/connexion?next=/projet/${projectId}`);

  const { data: projet } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .maybeSingle<{ owner_id: string }>();
  if (!projet || projet.owner_id !== user.id) redirect(`/projet/${projectId}`);

  const { data: adherent } = await supabase.rpc("a_une_adhesion_active", { p_profile_id: user.id });
  if (!adherent) redirect(`/projet/${projectId}`);

  const { data: metiers } = await supabase
    .from("roles")
    .select("slug")
    .lt("position", 90);
  const tous = (metiers ?? []).map((m) => m.slug as string);
  const coches = formData.getAll("metier").map(String).filter((m) => tous.includes(m));
  const visible = coches.length === tous.length ? null : coches;

  await supabase.from("projects").update({ visible_pour: visible }).eq("id", projectId);
  revalidatePath(`/projet/${projectId}`);
  revalidatePath("/pitchotheque");
  redirect(`/projet/${projectId}?enregistre=1`);
}

/** Une sélection de la Maison des Scénaristes (« Cannes 2019 ») ajoutée ou retirée : l'administration seule. */
export async function modifierSelection(formData: FormData) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  const projectId = formData.get("project_id") as string;
  if (!isAdmin) redirect(`/projet/${projectId}`);
  const libelle = ((formData.get("libelle") as string) ?? "").trim().slice(0, 80);
  const geste = formData.get("geste") as string;
  if (libelle) {
    if (geste === "retirer") {
      await supabase.from("project_selections").delete().eq("project_id", projectId).eq("libelle", libelle);
    } else {
      await supabase.from("project_selections").upsert({ project_id: projectId, libelle });
    }
  }
  revalidatePath(`/projet/${projectId}`);
  revalidatePath("/pitchotheque");
  revalidatePath("/admin/fiches");
  const retour = (formData.get("retour") as string) || "";
  redirect(retour.startsWith("/admin/fiches") ? retour : `/projet/${projectId}`);
}
