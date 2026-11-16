"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CATEGORIES_MAILING,
  EXPEDITEURS,
  REPONDRE_A,
  creditsBrevo,
  envoiArrete,
  envoyerEssai,
  nettoyerCorps,
  poursuivreEnvoi,
  type Mailing,
} from "@/lib/mailing";

/** Administration seulement ; les tables des mailings passent par la clé de service. */
async function requireAdmin() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();
  if (!user || !admin) redirect("/");
  return { admin, user };
}

function texte(formData: FormData, cle: string): string {
  return ((formData.get(cle) as string | null) ?? "").trim();
}

function liste(formData: FormData, cle: string): string[] {
  return formData.getAll(cle).map(String).filter(Boolean);
}

export async function creerMailing() {
  const { admin, user } = await requireAdmin();
  const { data } = await admin.from("mailings").insert({ cree_par: user.id }).select("id").single();
  redirect(data ? `/admin/mailing/${data.id}` : "/admin/mailing");
}

/**
 * Le formulaire a trois boutons : enregistrer, s'envoyer un essai, envoyer.
 * Dans tous les cas le brouillon est d'abord enregistré tel qu'à l'écran.
 */
export async function enregistrerMailing(formData: FormData) {
  const { admin, user } = await requireAdmin();
  const id = texte(formData, "id");
  const suite = texte(formData, "suite");
  const page = `/admin/mailing/${id}`;

  const { data: avant } = await admin.from("mailings").select("statut").eq("id", id).maybeSingle();
  if (!avant || avant.statut !== "brouillon") redirect(page);

  const expediteur = texte(formData, "expediteur_nom");
  const repondreA = texte(formData, "repondre_a");
  const categoriesPermises = CATEGORIES_MAILING.map((c) => c.cle);
  const { data: m } = await admin
    .from("mailings")
    .update({
      expediteur_nom: EXPEDITEURS.includes(expediteur) ? expediteur : EXPEDITEURS[0],
      repondre_a: REPONDRE_A.includes(repondreA) ? repondreA : REPONDRE_A[0],
      objet: texte(formData, "objet"),
      corps: nettoyerCorps(texte(formData, "corps")),
      bouton_libelle: texte(formData, "bouton_libelle") || null,
      bouton_lien: texte(formData, "bouton_lien") || null,
      categories: liste(formData, "categories").filter((c) => categoriesPermises.includes(c)),
      metiers: liste(formData, "metiers"),
      langues: liste(formData, "langues"),
    })
    .eq("id", id)
    .select("*")
    .single<Mailing>();
  if (!m) redirect(`${page}?erreur=enregistrement`);

  revalidatePath(page);
  if (suite !== "essai" && suite !== "envoyer") redirect(`${page}?ok=enregistre`);

  const vide = !m.objet || !m.corps.replace(/<[^>]+>/g, "").trim();
  if (vide) redirect(`${page}?erreur=vide`);

  if (suite === "essai") {
    const { data: moi } = await admin.from("profiles").select("first_name").eq("id", user.id).maybeSingle();
    const erreur = await envoyerEssai(m, {
      profileId: user.id,
      email: user.email ?? "",
      prenom: (moi?.first_name as string | null) ?? null,
    });
    redirect(erreur ? `${page}?erreur=essai` : `${page}?ok=essai`);
  }

  // Envoyer : la case de confirmation, puis assez de crédits chez Brevo.
  if (!formData.get("confirme")) redirect(`${page}?erreur=confirmation`);
  const { count } = await admin.rpc(
    "mailing_destinataires",
    { p_categories: m.categories, p_metiers: m.metiers, p_langues: m.langues },
    { count: "exact", head: true },
  );
  if (!count) redirect(`${page}?erreur=personne`);
  const credits = await creditsBrevo();
  if (credits !== null && credits < count) redirect(`${page}?erreur=credits`);

  const { data: fige } = await admin.rpc("mailing_figer", { p_mailing: id });
  if (!fige) redirect(`${page}?erreur=enregistrement`);
  after(() => poursuivreEnvoi(id));
  redirect(page);
}

/** Un envoi arrêté (refus de Brevo, redémarrage du site) reprend où il en était. */
export async function reprendreEnvoi(formData: FormData) {
  const { admin } = await requireAdmin();
  const id = texte(formData, "id");
  const { data: m } = await admin.from("mailings").select("statut, battement").eq("id", id).maybeSingle();
  if (m && envoiArrete(m as Pick<Mailing, "statut" | "battement">)) {
    await admin
      .from("mailings")
      .update({ statut: "envoi", battement: new Date().toISOString(), erreur: null })
      .eq("id", id);
    after(() => poursuivreEnvoi(id));
  }
  redirect(`/admin/mailing/${id}`);
}

export async function supprimerBrouillon(formData: FormData) {
  const { admin } = await requireAdmin();
  await admin.from("mailings").delete().eq("id", texte(formData, "id")).eq("statut", "brouillon");
  redirect("/admin/mailing");
}
