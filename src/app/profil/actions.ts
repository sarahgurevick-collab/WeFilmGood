"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const RESEAUX = ["vimeo", "linkedin", "viadeo", "instagram"];
const CATEGORIES = ["auteur", "producteur", "talent"];

async function requireUser(retour = "/profil") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/connexion?next=${encodeURIComponent(retour)}`);
  }

  return { supabase, user };
}

const texte = (formData: FormData, cle: string) =>
  (formData.get(cle) as string)?.trim() || null;

/** Bloc 1 — Qui êtes-vous ? : catégorie, métiers, ville, pays. */
export async function saveIdentite(formData: FormData) {
  const { supabase, user } = await requireUser("/profil/identite");

  const category = texte(formData, "category");
  if (category && CATEGORIES.includes(category)) {
    // La fonction pose aussi le statut de validation : un producteur ou
    // un talent passe en attente, un auteur n'en a pas besoin.
    await supabase.rpc("choisir_categorie", { p_category: category });
  }

  await supabase
    .from("profiles")
    .update({
      city: texte(formData, "city"),
      country: texte(formData, "country"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  // Le rôle lecteur ne se choisit pas : il vient d'une invitation de
  // l'administrateur et ne doit pas pouvoir être retiré ni ajouté ici.
  const roles = formData.getAll("roles").map(String);
  await supabase
    .from("profile_roles")
    .delete()
    .eq("profile_id", user.id)
    .neq("role_slug", "lecteur");
  if (roles.length) {
    await supabase
      .from("profile_roles")
      .insert(roles.map((role_slug) => ({ profile_id: user.id, role_slug })));
  }

  revalidatePath("/profil");
  redirect("/profil?enregistre=1");
}

/** Bloc 2 — Votre parcours : biofilmographie, référence, agent, réseaux. */
export async function saveParcours(formData: FormData) {
  const { supabase, user } = await requireUser("/profil/parcours");

  await supabase
    .from("profiles")
    .update({
      biofilmo: texte(formData, "biofilmo"),
      website: texte(formData, "website"),
      agent_name: texte(formData, "agent_name"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  for (const reseau of RESEAUX) {
    const url = texte(formData, `social_${reseau}`);
    if (url) {
      await supabase
        .from("profile_social_links")
        .upsert({ profile_id: user.id, network: reseau, url });
    } else {
      await supabase
        .from("profile_social_links")
        .delete()
        .eq("profile_id", user.id)
        .eq("network", reseau);
    }
  }

  revalidatePath("/profil");
  redirect("/profil?enregistre=1");
}

/** Bloc 3 — Vos goûts : langues, genres. */
export async function saveGouts(formData: FormData) {
  const { supabase, user } = await requireUser("/profil/gouts");

  const languages = formData.getAll("languages").map(String);
  const genres = formData.getAll("genres").map(String);

  await supabase.from("profile_languages").delete().eq("profile_id", user.id);
  if (languages.length) {
    await supabase
      .from("profile_languages")
      .insert(languages.map((language_code) => ({ profile_id: user.id, language_code })));
  }

  await supabase.from("profile_genres").delete().eq("profile_id", user.id);
  if (genres.length) {
    await supabase
      .from("profile_genres")
      .insert(genres.map((genre_slug) => ({ profile_id: user.id, genre_slug })));
  }

  revalidatePath("/profil");
  redirect("/profil?enregistre=1");
}

/** Bloc 4 — Votre témoignage. */
export async function saveTestimonial(formData: FormData) {
  const { supabase, user } = await requireUser("/profil/temoignage");

  await supabase
    .from("profiles")
    .update({
      testimonial: texte(formData, "testimonial"),
      testimonial_is_public: formData.get("testimonial_is_public") === "1",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/profil");
  revalidatePath("/temoignages");
  redirect("/profil?enregistre=1");
}

export async function quitterLaPlateforme(formData: FormData) {
  const { supabase, user } = await requireUser();

  if (formData.get("confirmation") !== "1") {
    redirect("/profil");
  }

  await supabase.rpc("mark_profile_departed", {
    p_profile_id: user.id,
    p_reason: texte(formData, "reason"),
  });

  await supabase.auth.signOut();
  redirect("/");
}
