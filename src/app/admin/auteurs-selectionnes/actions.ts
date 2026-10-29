"use server";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { ERREURS, adresseValide } from "@/lib/changement-adresse";
import { adresseFictive } from "@/lib/sans-adresse";
import { numeroVimeo } from "@/lib/videopitch";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Crée le profil d'un auteur sélectionné avant WFG 1 (25/10/2026, Sarah).
 * Comme les profils en attente des équipes : un compte de connexion, adresse
 * confirmée, AUCUN email envoyé ; l'auteur se connectera à l'ouverture de
 * WFG 2 avec cette adresse et retrouvera son profil. Sans adresse, le compte
 * porte une adresse fictive (src/lib/sans-adresse.ts), que Sarah remplacera
 * depuis l'écran des membres. Catégorie auteur, métier scénariste ; le
 * téléphone va dans les coordonnées réservées à l'équipe.
 *
 * Fiche du projet (25/10, Sarah : « Visible des membres tout de suite, comme
 * les fiches de WFG 1 », puis « crée toujours la fiche du projet avec son
 * titre, même sans lien Vimeo ») : chaque titre crée la fiche du projet (titre de la sélection, statut brouillon = aucune lecture
 * demandée, visible des membres), avec sa sélection (bandeau automatique)
 * et le videopitch s'il y a un lien Vimeo. Si la fiche existe déjà (co-auteur créé avant), le
 * videopitch y est seulement ajouté s'il manque.
 */
export type FicheAuteur = { titre: string; selections: string[]; vimeo: string; langue: "fr" | "en" };

const cleTitre = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export async function creerProfilAuteur(champs: {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  site?: string;
  fiches: FicheAuteur[];
}): Promise<{ id: string } | { erreur: string }> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { erreur: "Réservé à l'administration." };
  const admin = createAdminClient();
  if (!admin) return { erreur: ERREURS.indisponible };

  const prenom = champs.prenom.trim();
  const nom = champs.nom.trim();
  const email = champs.email.trim().toLowerCase();
  const telephone = champs.telephone.trim();
  if (!prenom && !nom) return { erreur: ERREURS.indisponible };
  if (email) {
    if (!adresseValide(email)) return { erreur: ERREURS.invalide };
    const { data: prise } = await admin.rpc("adresse_deja_utilisee", { p_email: email });
    if (prise === true) return { erreur: ERREURS.dejaUtilisee };
  }

  const fiches = champs.fiches
    .filter((f) => f.titre.trim())
    .map((f) => ({ ...f, numero: f.vimeo.trim() ? numeroVimeo(f.vimeo) : null }));
  if (fiches.some((f) => f.vimeo.trim() && !f.numero)) return { erreur: "Collez le lien Vimeo de la vidéo (vimeo.com/123456789)." };

  const id = randomUUID();
  const { error } = await admin.auth.admin.createUser({
    id,
    email: email || adresseFictive(id),
    email_confirm: true,
    user_metadata: {
      imported_from: "selection_mds",
      first_name: prenom,
      last_name: nom,
      category: "auteur",
    },
  });
  if (error) {
    if (error.code === "email_exists" || /already|exists/i.test(error.message)) return { erreur: ERREURS.dejaUtilisee };
    console.error("Profil d'auteur sélectionné : échec", error.message);
    return { erreur: ERREURS.indisponible };
  }

  // Le déclencheur de création de compte a fait le profil (prénom, nom,
  // catégorie). On ajoute le métier et les coordonnées.
  await admin
    .from("profile_roles")
    .upsert({ profile_id: id, role_slug: "scenariste" }, { onConflict: "profile_id,role_slug", ignoreDuplicates: true });
  if (email) {
    await admin
      .from("profile_contact_info")
      .upsert({ profile_id: id, email, updated_at: new Date().toISOString() }, { onConflict: "profile_id" });
  }
  // Le téléphone au même endroit que le formulaire du profil (« Qui êtes-
  // vous ? ») : sinon il n'y apparaît pas (Santiago Alejos, 25/10).
  if (telephone) {
    await admin
      .from("profile_private_details")
      .upsert({ profile_id: id, phone: telephone, updated_at: new Date().toISOString() }, { onConflict: "profile_id" });
  }

  const site = lienSite(champs.site ?? "");
  if (site) await admin.from("profiles").update({ website: site, site_reponse: true }).eq("id", id);

  for (const f of fiches) {
    const colonne = f.langue === "en" ? "videopitch_en" : "videopitch_fr";
    // Même titre, même sélection : la fiche d'un co-auteur déjà créée.
    const { data: memeSelection } = await admin
      .from("project_selections")
      .select("project_id, projects(title)")
      .in("libelle", f.selections)
      .returns<{ project_id: string; projects: { title: string } | null }[]>();
    let projet = (memeSelection ?? []).find((m) => cleTitre(m.projects?.title ?? "") === cleTitre(f.titre))?.project_id;
    if (!projet) {
      const { data: cree, error: e } = await admin
        .from("projects")
        .insert({ owner_id: id, title: f.titre.trim(), status: "brouillon", is_public: true })
        .select("id")
        .single();
      if (e || !cree) {
        console.error("Fiche d'auteur sélectionné : échec", e?.message);
        continue;
      }
      projet = cree.id as string;
      await admin.from("project_selections").insert(f.selections.map((libelle) => ({ project_id: projet, libelle })));
    }
    if (!f.numero) continue;
    const { data: existant } = await admin
      .from("project_videopitchs")
      .select("videopitch_fr, videopitch_en")
      .eq("project_id", projet)
      .maybeSingle();
    if (existant?.[colonne]) continue;
    await admin
      .from("project_videopitchs")
      .upsert({ project_id: projet, ...(existant ?? {}), [colonne]: f.numero }, { onConflict: "project_id" });
  }
  return { id };
}

/* « www.exemple.fr » → « https://www.exemple.fr », comme le formulaire du profil. */
const lienSite = (brut: string) => {
  const t = brut.trim();
  return t && !/^https?:\/\//i.test(t) ? `https://${t}` : t;
};

/** Le site internet pro d'un auteur déjà créé depuis l'onglet (29/10, Sarah). Vide = retiré. */
export async function poserSiteAuteur(id: string, brut: string): Promise<{ site: string } | { erreur: string }> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { erreur: "Réservé à l'administration." };
  const admin = createAdminClient();
  if (!admin || !id) return { erreur: ERREURS.indisponible };
  const site = lienSite(brut);
  const { error } = await admin.from("profiles").update({ website: site || null, site_reponse: site ? true : null }).eq("id", id);
  if (error) return { erreur: ERREURS.indisponible };
  return { site };
}

const PHOTOS = ["image/jpeg", "image/png", "image/webp"];

/**
 * La photo de profil d'un auteur créé depuis l'onglet (25/10, Sarah : « c'est
 * assez long d'aller à leur place sur leur profil »). Même traitement que la
 * photo posée par le membre lui-même : carré de 600 pixels centré sur le
 * visage, JPEG. Renvoie l'adresse de la photo, ou un message d'erreur.
 */
export async function poserPhotoAuteur(formData: FormData): Promise<{ url: string } | { erreur: string }> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { erreur: "Réservé à l'administration." };
  const admin = createAdminClient();
  if (!admin) return { erreur: "La photo n'a pas pu être enregistrée. Réessayez dans un instant." };

  const id = String(formData.get("profile_id") ?? "");
  const fichier = formData.get("photo");
  if (!id || !(fichier instanceof File) || fichier.size === 0) return { erreur: "Choisissez une photo." };
  if (fichier.type && !PHOTOS.includes(fichier.type)) {
    return { erreur: "Cette photo n'est pas dans un format accepté (JPEG, PNG ou WebP)." };
  }
  let donnees: Buffer;
  try {
    donnees = await sharp(Buffer.from(await fichier.arrayBuffer()), { failOn: "none" })
      .rotate()
      .resize(600, 600, { fit: "cover", position: sharp.strategy.attention })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
  } catch {
    return { erreur: "Cette photo n'a pas pu être lue. Essayez avec une autre image." };
  }

  const chemin = `${id}/avatar-${Date.now()}.jpg`;
  const { error } = await admin.storage.from("avatars").upload(chemin, donnees, { contentType: "image/jpeg" });
  if (error) {
    console.error("Photo d'auteur sélectionné refusée :", error.message);
    return { erreur: "La photo n'a pas pu être enregistrée. Réessayez dans un instant." };
  }
  const {
    data: { publicUrl },
  } = admin.storage.from("avatars").getPublicUrl(chemin);
  await admin.from("profiles").update({ avatar_url: publicUrl }).eq("id", id);
  // Les photos précédentes de ce profil ne servent plus.
  const { data: fichiers } = await admin.storage.from("avatars").list(id);
  const anciens = (fichiers ?? []).map((f) => `${id}/${f.name}`).filter((c) => c !== chemin);
  if (anciens.length) await admin.storage.from("avatars").remove(anciens);
  return { url: publicUrl };
}
