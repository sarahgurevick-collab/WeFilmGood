"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADHESION_AU_MOIS } from "@/lib/adhesion-paiement";
import { prixPackCentimes } from "@/lib/soleils-paiement";
import { creerIntention, echeancesMensuelles, modeHelloAsso, testeurPaiement } from "@/lib/helloasso";
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
    if (!estAdmin && !testeurPaiement(user.id)) redirect("/adhesion?paiement=bientot");
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
      ...(plan.slug === ADHESION_AU_MOIS.slug
        ? {
            echeances: {
              premierCentimes: ADHESION_AU_MOIS.premierCentimes,
              suivantes: echeancesMensuelles(ADHESION_AU_MOIS.premierCentimes, ADHESION_AU_MOIS.suivantes),
            },
          }
        : {}),
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

/**
 * « Acheter » un Pack Soleils (16/11/2026) : 5, 10 ou 20 soleils, au prix
 * adhérent ou non selon l'adhésion du moment. Les soleils sont ajoutés une
 * fois le paiement relu chez HelloAsso (lib/soleils-paiement).
 */
export async function acheterSoleils(formData: FormData) {
  const nombre = Number(formData.get("nombre"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/adhesion");

  if (modeHelloAsso() === "sandbox") {
    const { data: estAdmin } = await supabase.rpc("is_admin");
    if (!estAdmin && !testeurPaiement(user.id)) redirect("/adhesion?paiement=bientot");
  }

  const admin = createAdminClient();
  if (!admin) redirect("/adhesion?paiement=erreur");

  const [{ data: adherent }, { data: profil }] = await Promise.all([
    supabase.rpc("a_une_adhesion_active", { p_profile_id: user.id }),
    admin.from("profiles").select("first_name, last_name").eq("id", user.id).maybeSingle(),
  ]);
  const prix = prixPackCentimes(nombre, adherent === true);
  if (!prix) redirect("/adhesion?paiement=erreur");

  const { data: achat, error } = await admin
    .from("soleils_achats")
    .insert({ profile_id: user.id, nombre, amount_cents: prix, adherent: adherent === true })
    .select("id")
    .single();
  if (error || !achat) redirect("/adhesion?paiement=erreur");

  const h = await headers();
  const origine = `https://${h.get("host") ?? "app.wefilmgood.com"}`;
  const retour = `${origine}/adhesion/soleils?achat=${achat.id}`;

  let pageDePaiement: string;
  try {
    const intention = await creerIntention({
      montantCentimes: prix,
      libelle: `Pack ${nombre} soleils WeFilmGood`,
      retour,
      erreur: `${retour}&erreur=1`,
      annulation: `${origine}/adhesion`,
      payeur: { email: user.email!, prenom: profil?.first_name, nom: profil?.last_name },
      metadata: { soleils: achat.id, profil: user.id },
    });
    await admin.from("soleils_achats").update({ payment_reference: String(intention.id) }).eq("id", achat.id);
    pageDePaiement = intention.redirectUrl;
  } catch (e) {
    console.error("HelloAsso : achat de soleils", e);
    await admin.from("soleils_achats").update({ status: "annulee" }).eq("id", achat.id);
    redirect("/adhesion?paiement=erreur");
  }
  redirect(pageDePaiement);
}
