"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail, echapper } from "@/lib/brevo";
import {
  CHAMPS_ATELIER,
  dateAtelier,
  nomDeSalle,
  parisVersIso,
  type Atelier,
} from "@/lib/ateliers";

const SITE = "https://app.wefilmgood.com";
const MAX_INTERVENANTS = 5;

async function requireAdmin() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");
  return supabase;
}

function texte(formData: FormData, cle: string): string {
  return ((formData.get(cle) as string | null) ?? "").trim();
}

function gabarit(titre: string, corps: string, lien: string, bouton: string, pied: string) {
  return `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; max-width: 520px;">
      <p style="font-size: 17px; font-weight: 600;">${titre}</p>
      ${corps}
      <p style="margin: 28px 0;">
        <a href="${lien}" style="background: #DA2C25; color: #fff; padding: 12px 22px; border-radius: 6px; text-decoration: none; font-weight: 600;">${bouton}</a>
      </p>
      <p style="font-size: 13px; color: #666;">${pied}</p>
      <p style="font-size: 13px; color: #666;">— WeFilmGood</p>
    </div>
  `;
}

export async function creerAtelier(formData: FormData) {
  const supabase = await requireAdmin();
  const titre = texte(formData, "titre");
  const debut = parisVersIso(texte(formData, "debut"));
  const duree = Number(texte(formData, "duree_minutes")) || 90;
  if (!titre || !debut) redirect("/admin/ateliers?erreur=champs");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("ateliers")
    .insert({
      titre,
      description: texte(formData, "description") || null,
      debut,
      duree_minutes: duree,
      salle: nomDeSalle(titre),
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !data) redirect("/admin/ateliers?erreur=enregistrement");

  revalidatePath("/admin/ateliers");
  redirect(`/admin/ateliers/${data.id}`);
}

export async function modifierAtelier(formData: FormData) {
  const supabase = await requireAdmin();
  const id = texte(formData, "id");
  const titre = texte(formData, "titre");
  const debut = parisVersIso(texte(formData, "debut"));
  if (!titre || !debut) redirect(`/admin/ateliers/${id}?erreur=champs`);

  await supabase
    .from("ateliers")
    .update({
      titre,
      description: texte(formData, "description") || null,
      debut,
      duree_minutes: Number(texte(formData, "duree_minutes")) || 90,
    })
    .eq("id", id);

  revalidatePath(`/admin/ateliers/${id}`);
  redirect(`/admin/ateliers/${id}?enregistre=1`);
}

export async function supprimerAtelier(formData: FormData) {
  const supabase = await requireAdmin();
  await supabase.from("ateliers").delete().eq("id", texte(formData, "id"));
  revalidatePath("/admin/ateliers");
  redirect("/admin/ateliers");
}

export async function ajouterIntervenant(formData: FormData) {
  const supabase = await requireAdmin();
  const atelierId = texte(formData, "atelier_id");
  const nom = texte(formData, "nom");
  const email = texte(formData, "email").toLowerCase();
  if (!nom || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(`/admin/ateliers/${atelierId}?erreur=intervenant`);
  }

  const { count } = await supabase
    .from("atelier_intervenants")
    .select("id", { count: "exact", head: true })
    .eq("atelier_id", atelierId);
  if ((count ?? 0) >= MAX_INTERVENANTS) {
    redirect(`/admin/ateliers/${atelierId}?erreur=complet`);
  }

  await supabase.from("atelier_intervenants").insert({ atelier_id: atelierId, nom, email });
  revalidatePath(`/admin/ateliers/${atelierId}`);
}

export async function retirerIntervenant(formData: FormData) {
  const supabase = await requireAdmin();
  const atelierId = texte(formData, "atelier_id");
  await supabase.from("atelier_intervenants").delete().eq("id", texte(formData, "id"));
  revalidatePath(`/admin/ateliers/${atelierId}`);
}

/**
 * Envoie à chaque intervenant son lien personnel. Sans « id », seuls ceux
 * qui n'ont pas encore été invités le reçoivent ; avec, on renvoie à une
 * seule personne (lien perdu, date changée…).
 */
export async function inviterIntervenants(formData: FormData) {
  const supabase = await requireAdmin();
  const atelierId = texte(formData, "atelier_id");
  const seulement = texte(formData, "id");

  const { data: atelier } = await supabase
    .from("ateliers")
    .select(CHAMPS_ATELIER)
    .eq("id", atelierId)
    .single<Atelier>();
  if (!atelier) redirect("/admin/ateliers");

  let requete = supabase
    .from("atelier_intervenants")
    .select("id, nom, email, cle")
    .eq("atelier_id", atelierId);
  requete = seulement ? requete.eq("id", seulement) : requete.is("invite_le", null);
  const { data: intervenants } = await requete;

  let envoyes = 0;
  for (const i of intervenants ?? []) {
    const ok = await envoyerEmail({
      to: [{ email: i.email, name: i.nom }],
      subject: `Votre lien d'intervenant — ${atelier.titre}`,
      htmlContent: gabarit(
        `Bonjour ${echapper(i.nom)},`,
        `<p>Vous intervenez dans l'atelier WeFilmGood <strong>« ${echapper(atelier.titre)} »</strong>,
         le <strong>${dateAtelier(atelier.debut)}</strong> (heure de Paris).</p>
         <p>Le jour venu, cliquez sur le bouton ci-dessous : vous entrerez directement dans
         la salle, avec votre micro et votre caméra. Pas besoin de compte ni de logiciel,
         un navigateur récent suffit (Chrome ou Firefox de préférence).
         La salle ouvre 30 minutes avant le début.</p>`,
        `${SITE}/ateliers/${atelier.salle}?cle=${i.cle}`,
        "Rejoindre l'atelier",
        "Ce lien vous est personnel : merci de ne pas le transférer.",
      ),
    });
    if (ok) {
      envoyes++;
      await supabase
        .from("atelier_intervenants")
        .update({ invite_le: new Date().toISOString() })
        .eq("id", i.id);
    }
  }

  revalidatePath(`/admin/ateliers/${atelierId}`);
  redirect(`/admin/ateliers/${atelierId}?invites=${envoyes}`);
}

export async function choisirRediffusion(formData: FormData) {
  const supabase = await requireAdmin();
  const atelierId = texte(formData, "atelier_id");
  await supabase
    .from("ateliers")
    .update({ rediffusion_fichier: texte(formData, "fichier") || null })
    .eq("id", atelierId);
  revalidatePath(`/admin/ateliers/${atelierId}`);
}

/**
 * Envoie la rediffusion aux membres venus regarder et aux intervenants.
 * Le lien mène à la page de l'atelier, qui reste réservée aux membres.
 */
export async function envoyerRediffusion(formData: FormData) {
  const supabase = await requireAdmin();
  const atelierId = texte(formData, "atelier_id");

  const { data: atelier } = await supabase
    .from("ateliers")
    .select(CHAMPS_ATELIER)
    .eq("id", atelierId)
    .single<Atelier>();
  if (!atelier?.rediffusion_fichier) redirect(`/admin/ateliers/${atelierId}?erreur=rediffusion`);

  const [{ data: presences }, { data: intervenants }] = await Promise.all([
    supabase.from("atelier_presences").select("profile_id").eq("atelier_id", atelierId),
    supabase.from("atelier_intervenants").select("nom, email, cle").eq("atelier_id", atelierId),
  ]);

  const admin = createAdminClient();
  const dejaServis = new Set<string>();
  let envoyes = 0;

  const envoyer = async (email: string, nom: string | null, lien: string) => {
    if (dejaServis.has(email)) return;
    dejaServis.add(email);
    const ok = await envoyerEmail({
      to: [{ email, name: nom ?? undefined }],
      subject: `La rediffusion de l'atelier « ${atelier.titre} »`,
      htmlContent: gabarit(
        nom ? `Bonjour ${echapper(nom)},` : "Bonjour,",
        `<p>Merci d'avoir participé à l'atelier WeFilmGood
         <strong>« ${echapper(atelier.titre)} »</strong>.
         L'enregistrement est en ligne : vous pouvez le revoir quand vous voulez.</p>`,
        lien,
        "Voir la rediffusion",
        "La rediffusion est réservée aux membres de WeFilmGood.",
      ),
    });
    if (ok) envoyes++;
  };

  for (const i of intervenants ?? []) {
    await envoyer(i.email.toLowerCase(), i.nom, `${SITE}/ateliers/${atelier.salle}?cle=${i.cle}`);
  }
  if (admin) {
    for (const p of presences ?? []) {
      const [{ data: u }, { data: profil }] = await Promise.all([
        admin.auth.admin.getUserById(p.profile_id),
        admin.from("profiles").select("first_name").eq("id", p.profile_id).maybeSingle(),
      ]);
      const email = u.user?.email?.toLowerCase();
      if (email) await envoyer(email, profil?.first_name ?? null, `${SITE}/ateliers/${atelier.salle}`);
    }
  }

  await supabase
    .from("ateliers")
    .update({ rediffusion_envoyee_le: new Date().toISOString() })
    .eq("id", atelierId);

  revalidatePath(`/admin/ateliers/${atelierId}`);
  redirect(`/admin/ateliers/${atelierId}?rediffusion=${envoyes}`);
}
