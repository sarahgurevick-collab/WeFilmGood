import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { aCocheLeMetier, estLeCinecrush } from "@/lib/comedypitch";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_MUSICPITCH } from "@/lib/videopitch";

/**
 * Le MusicPitch (23/11/2026, migration 0323) : un compositeur dépose un
 * fichier son (thème ou chanson) pour un projet. « Le même principe » que
 * le ComedyPitch (Sarah, 13/11) : envoi, validation par l'équipe, étoiles,
 * et il paraît aussi sur le profil du compositeur. Il est rattaché au
 * projet, pas à un personnage.
 *
 * Le son est converti en MP3 par le serveur ; une fois validé, il reste
 * dans le stockage du site (dossier privé « musicpitchs ») et s'écoute par
 * un lien temporaire, donné à ceux qui ont le droit de voir la fiche.
 *
 * QUI DÉPOSE (24/11, Sarah, d'après Nicolas : « nous sommes un réseau
 * pro ») : uniquement un talent qui a coché le métier « Compositeur » dans
 * son profil, sur le projet d'un auteur adhérent ouvert avec un soleil, ou
 * sur le CinéCrush de la semaine. L'ouverture « à tous sauf aux
 * producteurs » de la veille est annulée.
 *
 * Ouvert aux membres le 24/11 (Sarah : « ok pour les 19 textes, ouvre le
 * musicpitch »). MUSICPITCH_OUVERT à faux le referme : l'administration
 * seule dépose alors.
 */
export const MUSICPITCH_OUVERT = true;

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

export type AccesMusicPitch = { projet: { id: string; owner_id: string; title: string } };

/** Le projet accepte-t-il de nouveaux MusicPitchs ? (auteur adhérent, ou CinéCrush de la semaine) */
export async function projetAccepteMusicPitch(admin: Admin, projet: { id: string; owner_id: string }) {
  const [cinecrush, { data: adherent }] = await Promise.all([
    estLeCinecrush(admin, projet.id),
    admin.rpc("a_une_adhesion_active", { p_profile_id: projet.owner_id }),
  ]);
  return { cinecrush, accepte: cinecrush || adherent === true };
}

/** La personne connectée peut-elle déposer un MusicPitch pour ce projet ? Rend le projet, ou null. */
export async function peutDeposerMusicPitch(
  supabase: SupabaseClient,
  userId: string,
  estAdmin: boolean,
  projectId: string,
): Promise<AccesMusicPitch | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: projet } = await admin
    .from("projects")
    .select("id, owner_id, title, is_public")
    .eq("id", projectId)
    .maybeSingle<{ id: string; owner_id: string; title: string; is_public: boolean }>();
  if (!projet) return null;
  if (estAdmin) return { projet };
  if (!MUSICPITCH_OUVERT || !projet.is_public || projet.owner_id === userId) return null;

  const { cinecrush, accepte } = await projetAccepteMusicPitch(admin, projet);
  if (!accepte || !(await aCocheLeMetier(admin, userId, "compositeur"))) return null;
  if (cinecrush) return { projet };
  const { data: ouverture } = await supabase
    .from("gravity_ouvertures")
    .select("project_id")
    .eq("profile_id", userId)
    .eq("project_id", projet.id)
    .maybeSingle();
  return ouverture ? { projet } : null;
}

/** Le dernier dépôt de cette personne pour ce projet (le plus récent d'abord). */
export async function dernierMusicPitch(userId: string, projectId: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("videopitch_depots")
    .select("id, etat, motif_refus, project_id")
    .eq("genre", "musicpitch")
    .eq("project_id", projectId)
    .eq("deposant_id", userId)
    .order("cree_le", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; etat: string; motif_refus: string | null; project_id: string }>();
  return data ?? null;
}

/** Un son refusé, illisible ou interrompu se renvoie toujours, même quand le dépôt est refermé. */
export const seRenvoie = (etat: string | null | undefined) => !!etat && ["refuse", "echec", "envoi"].includes(etat);

export type MusicPitchEnLigne = {
  id: string;
  projectId: string;
  compositeurId: string;
  /** Prénom seul, comme pour le ComedyPitch. */
  prenom: string;
  /** Lien d'écoute temporaire (une heure). */
  url: string;
  etoiles: number;
  /** La personne connectée a déjà envoyé son étoile. */
  donnee: boolean;
};

async function enLigne(
  admin: Admin,
  filtre: { colonne: "project_id" | "deposant_id"; valeur: string },
  userId: string,
): Promise<MusicPitchEnLigne[]> {
  const { data: depots } = await admin
    .from("videopitch_depots")
    .select("id, project_id, deposant_id")
    .eq("genre", "musicpitch")
    .eq("etat", "valide")
    .eq(filtre.colonne, filtre.valeur)
    .order("traite_le", { ascending: true })
    .returns<{ id: string; project_id: string; deposant_id: string }[]>();
  const lignes = depots ?? [];
  if (lignes.length === 0) return [];
  const [{ data: profils }, { data: etoiles }, { data: liens }] = await Promise.all([
    admin.from("profiles").select("id, first_name, full_name").in("id", [...new Set(lignes.map((d) => d.deposant_id))]),
    admin.from("comedypitch_etoiles").select("depot_id, profile_id").in("depot_id", lignes.map((d) => d.id)),
    admin.storage.from(BUCKET_MUSICPITCH).createSignedUrls(lignes.map((d) => `${d.id}.mp3`), 60 * 60),
  ]);
  const prenoms = new Map(
    (profils ?? []).map((p) => [
      p.id as string,
      ((p.first_name as string | null)?.trim() || (p.full_name as string | null)?.trim()?.split(" ")[0] || "") as string,
    ]),
  );
  const urls = new Map((liens ?? []).map((l) => [l.path, l.signedUrl]));
  return lignes
    .map((d) => {
      const siennes = (etoiles ?? []).filter((e) => e.depot_id === d.id);
      return {
        id: d.id,
        projectId: d.project_id,
        compositeurId: d.deposant_id,
        prenom: prenoms.get(d.deposant_id) ?? "",
        url: urls.get(`${d.id}.mp3`) ?? "",
        etoiles: siennes.length,
        donnee: siennes.some((e) => e.profile_id === userId),
      };
    })
    .filter((m) => m.url);
}

/** Les MusicPitchs en ligne d'un projet. À n'appeler que pour qui a le droit de les écouter. */
export async function musicpitchsDuProjet(projectId: string, userId: string) {
  const admin = createAdminClient();
  return admin ? enLigne(admin, { colonne: "project_id", valeur: projectId }, userId) : [];
}

/** Les MusicPitchs en ligne d'un compositeur, avec le titre du projet (pour son profil). */
export async function musicpitchsDuCompositeur(compositeurId: string, userId: string) {
  const admin = createAdminClient();
  if (!admin) return [];
  const lignes = await enLigne(admin, { colonne: "deposant_id", valeur: compositeurId }, userId);
  if (lignes.length === 0) return [];
  const { data: projets } = await admin.from("projects").select("id, title").in("id", lignes.map((l) => l.projectId));
  const titres = new Map((projets ?? []).map((p) => [p.id as string, p.title as string]));
  return lignes.map((l) => ({ ...l, projet: titres.get(l.projectId) ?? "" }));
}
