"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { reponsesDuFormulaire } from "@/lib/cinematch";
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

const reponseOuiNon = (formData: FormData, cle: string) => {
  const v = formData.get(cle);
  return v === "oui" ? true : v === "non" ? false : null;
};

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

  // Le téléphone n'empêche plus d'enregistrer (18/10, Sarah) : l'exiger
  // poussait ceux qui ne veulent pas le donner à taper un numéro bidon.
  const phone = texte(formData, "phone");

  const languages = formData.getAll("languages").map(String);
  if (!languages.length) {
    redirect(
      "/profil/identite?erreur=" + encodeURIComponent("Indiquez au moins une langue parlée."),
    );
  }

  // Un producteur ou un talent doit prouver au moins une expérience sur
  // un film : sans référence, pas de profil producteur. L'administration
  // juge ensuite sur cette référence. Un auteur n'a rien à prouver.
  // « imdb.com/name/… » vaut « https://imdb.com/name/… » : on complète.
  const websiteBrut = texte(formData, "website");
  const website = websiteBrut && !/^https?:\/\//i.test(websiteBrut) ? `https://${websiteBrut}` : websiteBrut;
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
      agent_name: formData.get("agent_reponse") === "oui" ? texte(formData, "agent_name") : null,
      agent_reponse: reponseOuiNon(formData, "agent_reponse"),
      reseaux_reponse: reponseOuiNon(formData, "reseaux_reponse"),
      // Le site d'un auteur se saisit ici ; celui d'un producteur ou d'un
      // autre talent est sa référence, saisie en bloc 1.
      ...(profil?.category === "auteur"
        ? {
            site_reponse: reponseOuiNon(formData, "site_reponse"),
            website: formData.get("site_reponse") === "oui" ? texte(formData, "website") : null,
          }
        : {}),
      autre_metier_actif: formData.get("autre_metier_actif") === "1",
      autre_metier: formData.get("autre_metier_actif") === "1" ? texte(formData, "autre_metier") : null,
      autre_genre_actif: formData.get("autre_genre_actif") === "1",
      autre_genre: formData.get("autre_genre_actif") === "1" ? texte(formData, "autre_genre") : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  const autorises = metiersPourCategorie(profil?.category);
  if (autorises.length) {
    const roles = formData.getAll("roles").map(String).filter((r) => autorises.includes(r));
    // On ne remplace que les métiers que le formulaire propose pour cette
    // catégorie : le rôle lecteur (invitation de l'administration) et les
    // métiers repris de WFG 1 qui ne figurent pas dans la liste (un auteur
    // aussi réalisateur, par exemple) restent en place (11/10).
    await supabase
      .from("profile_roles")
      .delete()
      .eq("profile_id", user.id)
      .in("role_slug", autorises);
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

  const [{ data: questions }, { data: fiche }] = await Promise.all([
    supabase.from("personality_questions").select("key"),
    supabase.from("profiles").select("personality_answers, personality_unlocked_at").eq("id", user.id).maybeSingle(),
  ]);
  const nouvelles = reponsesDuFormulaire(
    formData,
    (questions ?? []).map((q) => q.key as string),
  );

  // Les réponses déjà données sont verrouillées (20/10/2026) : on ne
  // peut que répondre aux questions restées vides, sauf si l'administration
  // a déverrouillé ce membre (une seule sauvegarde).
  const deverrouille = !!fiche?.personality_unlocked_at;
  const anciennes = (fiche?.personality_answers ?? {}) as Record<string, string>;
  const reponses = deverrouille ? nouvelles : { ...nouvelles, ...anciennes };

  await supabase
    .from("profiles")
    .update({
      personality_answers: reponses,
      personality_unlocked_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/profil");
  // Depuis la page CinéMatch du Menu, on y revient plutôt que d'aller au sommaire.
  if (formData.get("retour") === "/cinefusion") redirect("/cinefusion?enregistre=1");
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

/**
 * La page d'où part la photo : l'identité du membre, ou le profil du lecteur
 * (qui n'a pas accès à /profil). Une liste fermée, jamais une adresse libre.
 */
function pageDeRetourPhoto(formData: FormData) {
  return formData.get("retour") === "/lecteur/profil" ? "/lecteur/profil" : "/profil/identite";
}

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
  const page = pageDeRetourPhoto(formData);
  const { supabase, user } = await requireUser(page);
  const retour = (message: string) =>
    redirect(`${page}?erreur=` + encodeURIComponent(message));

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
  redirect(`${page}?photo=1`);
}

export async function retirerPhoto(formData: FormData) {
  const page = pageDeRetourPhoto(formData);
  const { supabase, user } = await requireUser(page);
  await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  await nettoyerPhotos(supabase, user.id);
  revalidatePath("/profil");
  redirect(page);
}

/** Ouvre ou ferme la messagerie d'un producteur ou d'un comédien (08/10, étape 1 du test). */
export async function reglerMessagerie(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { data: surveille } = await supabase.rpc("messagerie_surveillee", { uid: user.id });
  if (surveille === true) {
    await supabase.from("profiles").update({ messages_ouverts: formData.get("ouvrir") === "1" }).eq("id", user.id);
  }
  redirect("/profil/compte?messagerie=1");
}
