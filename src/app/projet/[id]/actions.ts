"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerInvitationEquipe, preparerInvitation } from "@/lib/lien-magique";

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
  const permis = ["signe", "tourne", "script_prime", "film_prime", "selection_mds"];
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

/** Au plus dix invitations par jour et par porteur : pas d'emails en rafale à des inconnus. */
const MAX_INVITATIONS_PAR_JOUR = 10;

/**
 * Inviter un talent sur son projet (20/10/2026, Sarah) : le porteur donne une
 * adresse et un métier, le talent reçoit un lien magique et accepte ou refuse
 * sur la page /invitation. Un talent déjà inscrit accepte lui aussi.
 */
export async function inviterUnTalent(formData: FormData) {
  const projectId = (formData.get("project_id") as string) ?? "";
  const retour = (r: string) => redirect(`/projet/${projectId}?talent=${r}#equipe`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/projet/${projectId}`);

  const { data: projet } = await supabase
    .from("projects")
    .select("id, title, owner_id")
    .eq("id", projectId)
    .maybeSingle<{ id: string; title: string; owner_id: string }>();
  const { data: estAdmin } = await supabase.rpc("is_admin");
  if (!projet || (projet.owner_id !== user.id && estAdmin !== true)) redirect(`/projet/${projectId}`);

  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const prenom = ((formData.get("prenom") as string) ?? "").trim().slice(0, 60) || null;
  const metierSlug = (formData.get("metier") as string) ?? "";
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email)) retour("adresse");
  if (prenom && /\d/.test(prenom)) retour("adresse");

  const { data: metier } = await supabase
    .from("roles")
    .select("slug, label_fr")
    .eq("slug", metierSlug)
    .lt("position", 90)
    .maybeSingle<{ slug: string; label_fr: string }>();
  if (!metier) retour("metier");

  const admin = createAdminClient();
  if (!admin) retour("erreur");
  const service = admin!;

  // Déjà dans l'équipe (ou déjà invité) avec cette adresse.
  const { data: existe } = await service
    .from("project_co_authors")
    .select("id")
    .eq("project_id", projectId)
    .ilike("invited_email", email)
    .in("status", ["invite", "accepte"])
    .limit(1);
  if (existe?.length) retour("deja");

  // Le plafond du jour, pour le porteur du projet.
  const { data: sesProjets } = await service.from("projects").select("id").eq("owner_id", projet!.owner_id);
  const depuis = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await service
    .from("project_co_authors")
    .select("id", { count: "exact", head: true })
    .in("project_id", (sesProjets ?? []).map((p) => p.id))
    .eq("status", "invite")
    .gte("invited_at", depuis);
  if ((count ?? 0) >= MAX_INVITATIONS_PAR_JOUR) retour("plafond");

  const prep = await preparerInvitation(email);
  if (!prep.ok) retour("erreur");
  const { profileId, tokenHash, nouveau } = prep as Extract<typeof prep, { ok: true }>;

  // Le porteur ne s'invite pas lui-même ; un lecteur n'est pas joignable
  // (on répond comme si l'invitation était partie, sans rien dire de plus).
  if (profileId === projet!.owner_id) retour("deja");
  const { data: lecteur } = await service
    .from("profile_roles")
    .select("role_slug")
    .eq("profile_id", profileId)
    .eq("role_slug", "lecteur")
    .maybeSingle();
  if (lecteur) retour("ok");

  const { data: ligne, error } = await service
    .from("project_co_authors")
    .insert({ project_id: projectId, profile_id: profileId, invited_email: email, status: "invite", role_slug: metier!.slug })
    .select("id")
    .single<{ id: string }>();
  if (error || !ligne) retour("erreur");

  const { data: porteurFiche } = await service
    .from("profiles")
    .select("full_name, display_name, first_name")
    .eq("id", projet!.owner_id)
    .maybeSingle<{ full_name: string | null; display_name: string | null; first_name: string | null }>();
  const { data: invite } = nouveau
    ? { data: null }
    : await service.from("profiles").select("first_name").eq("id", profileId).maybeSingle<{ first_name: string | null }>();

  const parti = await envoyerInvitationEquipe({
    email,
    prenom: prenom ?? invite?.first_name ?? null,
    titreProjet: projet!.title,
    porteur: porteurFiche?.display_name?.trim() || porteurFiche?.full_name?.trim() || "un auteur",
    metier: metier!.label_fr,
    tokenHash,
    nouveau,
    ligneId: ligne!.id,
  });
  revalidatePath(`/projet/${projectId}`);
  retour(parti ? "ok" : "envoi");
}
