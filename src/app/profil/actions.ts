"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const RESEAUX = ["vimeo", "linkedin", "viadeo", "instagram"];
const GENRES_PERSONNE = ["homme", "femme", "autre"];

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/profil");
  }

  return { supabase, user };
}

const texte = (formData: FormData, cle: string) =>
  (formData.get(cle) as string)?.trim() || null;

export async function savePrivateDetails(formData: FormData) {
  const { supabase, user } = await requireUser();

  const gender = texte(formData, "gender");

  await supabase.from("profile_private_details").upsert({
    profile_id: user.id,
    address: texte(formData, "address"),
    postal_code: texte(formData, "postal_code"),
    phone: texte(formData, "phone"),
    birthdate: texte(formData, "birthdate"),
    gender: gender && GENRES_PERSONNE.includes(gender) ? gender : null,
    updated_at: new Date().toISOString(),
  });

  // Ville et pays restent sur le profil : ils sont publics, contrairement
  // au reste de cette section.
  await supabase
    .from("profiles")
    .update({
      city: texte(formData, "city"),
      country: texte(formData, "country"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/profil");
  redirect("/profil?enregistre=1");
}

export async function savePublicInfo(formData: FormData) {
  const { supabase, user } = await requireUser();

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

export async function saveTestimonial(formData: FormData) {
  const { supabase, user } = await requireUser();

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

export async function saveKeywords(formData: FormData) {
  const { supabase, user } = await requireUser();

  const roles = formData.getAll("roles").map(String);
  const languages = formData.getAll("languages").map(String);
  const genres = formData.getAll("genres").map(String);

  // Le rôle lecteur ne se choisit pas : il vient d'une invitation de
  // l'administrateur et ne doit pas pouvoir être retiré ni ajouté ici.
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
