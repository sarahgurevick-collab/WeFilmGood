"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { echapper, envoyerEmail } from "@/lib/brevo";
import { createAdminClient, emailDuMembre } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** La programmation CinéCrush et la relecture des commentaires : l'administration seule. */
async function adminConnecte() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!user || !isAdmin) redirect("/");
  const admin = createAdminClient();
  if (!admin) redirect("/admin/cinecrush?erreur=" + encodeURIComponent("Indisponible."));
  return { user, admin, supabase };
}

const retour = (message?: string): never =>
  redirect(message ? `/admin/cinecrush?erreur=${encodeURIComponent(message)}` : "/admin/cinecrush");

function rafraichir() {
  revalidatePath("/admin/cinecrush");
  revalidatePath("/cinecrush");
}

/** Un dimanche, au format AAAA-MM-JJ, sinon rien. */
function dimanche(valeur: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return null;
  const d = new Date(valeur + "T12:00:00Z");
  if (Number.isNaN(d.getTime()) || d.getUTCDay() !== 0) return null;
  return valeur;
}

/**
 * Programmer un projet sur une semaine. Le projet est choisi dans la
 * liste des candidats, ou par son titre exact (le projet doit avoir un
 * videopitch et une vignette). L'auteur est prévenu par email.
 */
export async function programmerCineCrush(formData: FormData) {
  const { user, admin } = await adminConnecte();
  const semaine = dimanche(((formData.get("semaine") as string) ?? "").trim());
  if (!semaine) retour("La date doit être un dimanche.");

  let projectId = ((formData.get("project_id") as string) ?? "").trim();
  const titre = ((formData.get("titre") as string) ?? "").trim();
  if (!projectId && titre) {
    const { data: trouves } = await admin
      .from("projects")
      .select("id, title")
      .ilike("title", titre)
      .eq("is_public", true)
      .limit(2);
    if (!trouves || trouves.length === 0) return retour(`Aucun projet visible ne s'appelle « ${titre} ».`);
    if (trouves.length > 1) retour(`Deux projets s'appellent « ${titre} » : choisissez-le dans la liste.`);
    projectId = trouves[0].id;
  }
  if (!projectId) retour("Choisissez un projet.");

  const { data: projet } = await admin
    .from("projects")
    .select("id, title, owner_id, a_videopitch, owner:profiles!projects_owner_id_fkey(full_name)")
    .eq("id", projectId)
    .maybeSingle<{ id: string; title: string; owner_id: string; a_videopitch: boolean; owner: { full_name: string | null } | null }>();
  if (!projet) retour("Projet introuvable.");
  if (!projet!.a_videopitch) retour(`« ${projet!.title} » n'a pas de videopitch.`);

  const { error } = await admin
    .from("cinecrush")
    .insert({ project_id: projet!.id, semaine, cree_par: user.id });
  if (error) {
    if (error.code === "23505") retour("Cette semaine est déjà prise, ou ce projet a déjà été CinéCrush.");
    retour(error.message);
  }

  // L'auteur est prévenu : c'est lui qui va faire venir du monde (Sarah, 24/10).
  const email = await emailDuMembre(projet!.owner_id);
  if (email) {
    const date = new Date(semaine! + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    await envoyerEmail({
      to: [{ email, name: projet!.owner?.full_name ?? undefined }],
      subject: `Votre projet « ${projet!.title} » sera le CinéCrush de la semaine du ${date}`,
      htmlContent: `<p>Bonjour,</p>
<p>Votre projet <strong>${echapper(projet!.title)}</strong> a été choisi comme <strong>CinéCrush</strong> de WeFilmGood pour la semaine du ${date} (du dimanche minuit au dimanche minuit).</p>
<p>Pendant cette semaine, votre videopitch est mis en avant sur la page CinéCrush et visible de tous les membres, qui peuvent laisser leurs avis en commentaires. Vous pourrez leur répondre.</p>
<p>D'ici là, c'est une surprise pour les membres : rien n'est annoncé sur le site avant le dimanche. Mais vous, vous pouvez prévenir votre entourage : c'est vous qui ferez venir du monde.</p>
<p><a href="https://app.wefilmgood.com/cinecrush">https://app.wefilmgood.com/cinecrush</a></p>
<p>L'équipe WeFilmGood</p>`,
    });
  }
  rafraichir();
  retour();
}

/** Retirer une semaine programmée (à venir, ou passée si besoin). */
export async function retirerCineCrush(formData: FormData) {
  const { admin } = await adminConnecte();
  const id = (formData.get("id") as string) ?? "";
  if (id) await admin.from("cinecrush").delete().eq("id", id);
  rafraichir();
  retour();
}

/** Un commentaire mis de côté par le filtre : publié ou retiré. Un commentaire publié : retiré. */
export async function modererCommentaire(formData: FormData) {
  const { admin } = await adminConnecte();
  const id = (formData.get("id") as string) ?? "";
  const geste = (formData.get("geste") as string) ?? "";
  if (id && (geste === "publier" || geste === "retirer")) {
    await admin
      .from("cinecrush_commentaires")
      .update({ statut: geste === "publier" ? "publie" : "retire" })
      .eq("id", id);
  }
  rafraichir();
  retour();
}

/** L'interrupteur du filtre IA. */
export async function reglerFiltreIa(formData: FormData) {
  const { admin } = await adminConnecte();
  const valeur = formData.get("valeur") === "oui";
  await admin.from("cinecrush_reglages").upsert({ cle: "filtre_ia", valeur });
  rafraichir();
  retour();
}
