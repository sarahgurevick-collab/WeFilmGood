"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";
import { metiersPourCategorie } from "./metiers";

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

/**
 * Bloc 1 — Qui êtes-vous ? : prénom et nom (le nom affiché partout — un
 * nom de plume se met là), catégorie, langues, téléphone, ville, pays,
 * tous obligatoires ; et la référence professionnelle, obligatoire pour un
 * producteur ou un talent (masquée pour un auteur).
 * Les métiers ont été retirés de ce bloc (reportés à plus tard) : cette
 * action ne touche donc plus profile_roles, pour ne pas effacer les
 * métiers déjà attribués (import de WFG 1, invitation lecteur…) à
 * chaque enregistrement.
 */
export async function saveIdentite(formData: FormData) {
  const { supabase, user } = await requireUser("/profil/identite");

  const firstName = texte(formData, "first_name");
  const lastName = texte(formData, "last_name");
  const category = texte(formData, "category");
  const city = texte(formData, "city");
  const country = texte(formData, "country");

  if (!firstName || !lastName) {
    redirect("/profil/identite?erreur=" + encodeURIComponent("Le prénom et le nom sont obligatoires."));
  }
  if (!category || !CATEGORIES.includes(category)) {
    redirect("/profil/identite?erreur=" + encodeURIComponent("Choisissez qui vous êtes."));
  }
  if (!city) {
    redirect("/profil/identite?erreur=" + encodeURIComponent("La ville est obligatoire."));
  }
  if (!country) {
    redirect("/profil/identite?erreur=" + encodeURIComponent("Le pays est obligatoire."));
  }

  const phone = texte(formData, "phone");
  if (!phone) {
    redirect("/profil/identite?erreur=" + encodeURIComponent("Le téléphone est obligatoire."));
  }

  const languages = formData.getAll("languages").map(String);
  if (!languages.length) {
    redirect(
      "/profil/identite?erreur=" + encodeURIComponent("Indiquez au moins une langue parlée."),
    );
  }

  // Un producteur ou un talent doit prouver au moins une expérience sur
  // un film : sans référence, pas de profil producteur. L'administration
  // juge ensuite sur cette référence. Un auteur n'a rien à prouver.
  const website = texte(formData, "website");
  const doitProuver = category === "producteur" || category === "talent";
  if (doitProuver && !website) {
    redirect(
      "/profil/identite?erreur=" +
        encodeURIComponent(
          "La référence professionnelle est obligatoire pour un producteur ou un autre talent.",
        ),
    );
  }

  // La fonction pose aussi le statut de validation : un producteur ou un
  // talent passe en attente, un auteur n'en a pas besoin.
  await supabase.rpc("choisir_categorie", { p_category: category });

  await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      city,
      country,
      ...(doitProuver ? { website } : {}),
      // Pas de pseudonyme sur WFG 2 (migration 0065) : le nom affiché
      // est toujours prénom et nom.
      display_name: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  // Le téléphone est réservé à l'administration : il vit dans la table
  // privée, jamais sur le profil visible des membres.
  await supabase
    .from("profile_private_details")
    .upsert({ profile_id: user.id, phone, updated_at: new Date().toISOString() });

  await supabase.from("profile_languages").delete().eq("profile_id", user.id);
  await supabase
    .from("profile_languages")
    .insert(languages.map((language_code) => ({ profile_id: user.id, language_code })));

  revalidatePath("/profil");
  redirect("/profil?enregistre=1");
}

/**
 * Bloc 2 — Votre parcours : la biofilmographie est obligatoire, le reste
 * (compétences, genres, agent, réseaux) facultatif. La référence professionnelle
 * se demande en bloc 1, pas ici. Les
 * métiers proposés dépendent de la catégorie choisie en bloc 1 ; on ne
 * retient que ceux du bon groupe, même si le formulaire a été manipulé
 * pour en envoyer d'autres.
 */
export async function saveParcours(formData: FormData) {
  const { supabase, user } = await requireUser("/profil/parcours");

  const biofilmo = texte(formData, "biofilmo");
  if (!biofilmo) {
    redirect("/profil/parcours?erreur=" + encodeURIComponent("La biofilmographie est obligatoire."));
  }

  const { data: profil } = await supabase
    .from("profiles")
    .select("category")
    .eq("id", user.id)
    .maybeSingle();

  await supabase
    .from("profiles")
    .update({
      biofilmo,
      agent_name: texte(formData, "agent_name"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  const autorises = metiersPourCategorie(profil?.category);
  if (autorises.length) {
    const roles = formData.getAll("roles").map(String).filter((r) => autorises.includes(r));
    // Le rôle lecteur ne se choisit pas ici : il vient d'une invitation de
    // l'administrateur et ne doit pas pouvoir être retiré ni ajouté.
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
  }

  const genres = formData.getAll("genres").map(String);
  await supabase.from("profile_genres").delete().eq("profile_id", user.id);
  if (genres.length) {
    await supabase
      .from("profile_genres")
      .insert(genres.map((genre_slug) => ({ profile_id: user.id, genre_slug })));
  }

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

/**
 * Bloc 3 — Mieux vous connaître : le portrait chinois, rien d'obligatoire. Une réponse libre l'emporte sur la
 * liste et s'enregistre « autre:… », en minuscules, comme les réponses
 * reprises de WFG 1 — c'est ce qui permet de rapprocher deux membres.
 */
export async function saveGouts(formData: FormData) {
  const { supabase, user } = await requireUser("/profil/gouts");

  const { data: questions } = await supabase.from("personality_questions").select("key");
  const reponses: Record<string, string> = {};
  for (const { key } of questions ?? []) {
    const libre = texte(formData, `q_${key}_autre`);
    const liste = texte(formData, `q_${key}`);
    if (libre) reponses[key] = "autre:" + libre.toLowerCase().slice(0, 200);
    else if (liste) reponses[key] = liste;
  }
  await supabase
    .from("profiles")
    .update({ personality_answers: reponses, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/profil");
  redirect("/profil?enregistre=1");
}

/**
 * Le témoignage a été retiré du parcours de complétion du profil (les
 * nouveaux membres ne connaissent pas encore assez la plateforme pour
 * en parler) : plus aucune page n'appelle cette action aujourd'hui.
 * On la garde, ainsi que les colonnes testimonial* et /temoignages,
 * pour une réintégration à décider plus tard.
 */
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

export async function quitterLaPlateforme(formData: FormData) {
  const { supabase, user } = await requireUser();

  if (formData.get("confirmation") !== "1") {
    redirect("/profil/compte");
  }

  await supabase.rpc("mark_profile_departed", {
    p_profile_id: user.id,
    p_reason: texte(formData, "reason"),
  });

  await supabase.auth.signOut();
  redirect("/");
}

const PHOTOS = ["image/jpeg", "image/png", "image/webp"];
const BUCKET_PHOTOS = "avatars";

/** Retire les anciennes photos du dossier du membre, sauf celle qu'on garde. */
async function nettoyerPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  garder?: string,
) {
  const { data: fichiers } = await supabase.storage.from(BUCKET_PHOTOS).list(userId);
  const anciens = (fichiers ?? [])
    .map((f) => `${userId}/${f.name}`)
    .filter((chemin) => chemin !== garder);
  if (anciens.length) await supabase.storage.from(BUCKET_PHOTOS).remove(anciens);
}

/**
 * La photo du profil : recadrée en carré (sharp repère le visage ou le
 * sujet), 600 pixels, en JPEG. Une photo de téléphone de plusieurs Mo
 * finit vers 60 Ko, et s'affiche ronde partout sur le site.
 */
export async function savePhoto(formData: FormData) {
  const { supabase, user } = await requireUser("/profil/identite");
  const retour = (message: string) =>
    redirect("/profil/identite?erreur=" + encodeURIComponent(message));

  const fichier = formData.get("photo");
  if (!(fichier instanceof File) || fichier.size === 0) retour("Choisissez une photo.");
  const photo = fichier as File;
  if (photo.type && !PHOTOS.includes(photo.type)) {
    retour("Cette photo n'est pas dans un format accepté (JPEG, PNG ou WebP).");
  }

  let donnees: Buffer;
  try {
    donnees = await sharp(Buffer.from(await photo.arrayBuffer()), { failOn: "none" })
      .rotate()
      .resize(600, 600, { fit: "cover", position: sharp.strategy.attention })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
  } catch {
    return retour("Cette photo n'a pas pu être lue. Essayez avec une autre image.");
  }

  const chemin = `${user.id}/avatar-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET_PHOTOS)
    .upload(chemin, donnees, { contentType: "image/jpeg" });
  if (error) {
    console.error("Dépôt de photo refusé :", error.message);
    retour("La photo n'a pas pu être enregistrée. Réessayez dans un instant.");
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_PHOTOS).getPublicUrl(chemin);
  await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
  await nettoyerPhotos(supabase, user.id, chemin);

  revalidatePath("/profil");
  redirect("/profil/identite?photo=1");
}

export async function retirerPhoto() {
  const { supabase, user } = await requireUser("/profil/identite");
  await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  await nettoyerPhotos(supabase, user.id);
  revalidatePath("/profil");
  redirect("/profil/identite");
}
