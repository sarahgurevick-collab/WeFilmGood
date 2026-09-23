"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Une facture de lecteur réglée : toutes ses fiches passent en « payée »
 * d'un coup. C'est le lecteur qui a choisi les fiches en établissant sa
 * facture ; l'administration n'a plus qu'à confirmer le paiement.
 */
export async function payerFacture(formData: FormData) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const facture = formData.get("facture") as string;
  const retour = (formData.get("retour") as string) || "/admin/lecteurs";

  await supabase
    .from("reading_reports")
    .update({ payment_status: "payee", paid_at: new Date().toISOString() })
    .eq("invoice_id", facture)
    .eq("payment_status", "due");

  revalidatePath("/admin/lecteurs", "layout");
  redirect(retour.startsWith("/admin/lecteurs") ? retour : "/admin/lecteurs");
}

/**
 * Réactive un ancien lecteur de WFG 1 : crée son compte (sans lui envoyer
 * d'email), lui donne le rôle de lecteur et reprend son ancien profil. Il
 * lui suffira ensuite de demander un lien de connexion avec son adresse.
 */
export async function reactiverLecteur(formData: FormData) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const service = createAdminClient();
  if (!service) redirect("/admin/lecteurs");

  const legacyId = Number(formData.get("legacy_id"));
  const { data: ancien } = await service
    .from("legacy_profiles")
    .select("legacy_user_id, email, full_name, city, country, biofilmo")
    .eq("legacy_user_id", legacyId)
    .maybeSingle();
  if (!ancien) redirect(`/admin/lecteurs/ancien/${legacyId}?erreur=profil`);

  // Le compte existe peut-être déjà (compte repris pour un projet) :
  // on le retrouve par l'adresse plutôt que d'en créer un second.
  let uid: string | null = null;
  const [prenom, ...reste] = (ancien.full_name ?? "").split(" ");
  const { data: cree, error } = await service.auth.admin.createUser({
    email: ancien.email,
    email_confirm: true,
    user_metadata: {
      first_name: prenom,
      last_name: reste.join(" "),
      full_name: ancien.full_name,
      legacy_id: legacyId,
      imported_from: "ancienne_plateforme",
    },
  });
  if (cree?.user) {
    uid = cree.user.id;
  } else if (error) {
    const cible = ancien.email.toLowerCase();
    for (let page = 1; !uid; page++) {
      const { data } = await service.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      const comptes = data?.users ?? [];
      uid = comptes.find((c) => c.email?.toLowerCase() === cible)?.id ?? null;
      if (comptes.length < 1000) break;
    }
  }
  if (!uid) redirect(`/admin/lecteurs/ancien/${legacyId}?erreur=compte`);

  const { data: profil } = await service
    .from("profiles")
    .select("city, country, biofilmo, legacy_user_id")
    .eq("id", uid)
    .maybeSingle();

  await service
    .from("profiles")
    .update({
      city: profil?.city ?? ancien.city,
      country: profil?.country ?? ancien.country,
      biofilmo: profil?.biofilmo ?? ancien.biofilmo,
      legacy_user_id: profil?.legacy_user_id ?? legacyId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", uid);
  await service
    .from("profile_roles")
    .upsert({ profile_id: uid, role_slug: "lecteur" });
  await service
    .from("reader_profiles")
    .upsert({ profile_id: uid }, { onConflict: "profile_id" });
  await service
    .from("legacy_profiles")
    .update({ claimed_by: uid, claimed_at: new Date().toISOString() })
    .eq("legacy_user_id", legacyId)
    .is("claimed_by", null);

  revalidatePath("/admin/lecteurs", "layout");
  redirect(`/admin/lecteurs/${uid}`);
}
