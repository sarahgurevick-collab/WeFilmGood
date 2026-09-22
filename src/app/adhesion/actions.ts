"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { creerIntention, modeHelloAsso } from "@/lib/helloasso";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * « Adhérer » : crée l'adhésion en attente, demande à HelloAsso une page
 * de paiement pour le bon montant, et y envoie le membre. L'adhésion ne
 * passe active qu'une fois le paiement relu chez HelloAsso.
 *
 * En mode test (compte sandbox), seule l'administration peut payer : un
 * membre ne doit pas pouvoir obtenir une vraie adhésion avec une fausse
 * carte.
 */
export async function adherer(formData: FormData) {
  const planSlug = formData.get("plan") as string;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/adhesion");

  if (modeHelloAsso() === "sandbox") {
    const { data: estAdmin } = await supabase.rpc("is_admin");
    if (!estAdmin) redirect("/adhesion?paiement=bientot");
  }

  const admin = createAdminClient();
  if (!admin) redirect("/adhesion?paiement=erreur");

  const [{ data: plan }, { data: profil }] = await Promise.all([
    admin
      .from("membership_plans")
      .select("slug, label, price_cents, currency")
      .eq("slug", planSlug)
      .eq("is_active", true)
      .maybeSingle(),
    admin.from("profiles").select("first_name, last_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!plan || !plan.price_cents) redirect("/adhesion?paiement=erreur");

  const { data: adhesion, error } = await admin
    .from("memberships")
    .insert({
      profile_id: user.id,
      plan_slug: plan.slug,
      status: "en_attente_paiement",
      amount_cents: plan.price_cents,
      currency: plan.currency ?? "EUR",
      payment_provider: "helloasso",
    })
    .select("id")
    .single();
  if (error || !adhesion) redirect("/adhesion?paiement=erreur");

  const h = await headers();
  const hote = h.get("host") ?? "app.wefilmgood.com";
  const origine = `https://${hote}`;
  const retour = `${origine}/adhesion/retour?adhesion=${adhesion.id}`;

  let pageDePaiement: string;
  try {
    const intention = await creerIntention({
      montantCentimes: plan.price_cents,
      libelle: `Adhésion WeFilmGood — ${plan.label}`,
      retour,
      erreur: `${retour}&erreur=1`,
      annulation: `${origine}/adhesion`,
      payeur: { email: user.email!, prenom: profil?.first_name, nom: profil?.last_name },
      metadata: { adhesion: adhesion.id, profil: user.id },
    });
    await admin
      .from("memberships")
      .update({ payment_reference: String(intention.id), updated_at: new Date().toISOString() })
      .eq("id", adhesion.id);
    pageDePaiement = intention.redirectUrl;
  } catch (e) {
    console.error("HelloAsso : création du paiement", e);
    await admin.from("memberships").update({ status: "annulee" }).eq("id", adhesion.id);
    redirect("/adhesion?paiement=erreur");
  }
  redirect(pageDePaiement);
}
