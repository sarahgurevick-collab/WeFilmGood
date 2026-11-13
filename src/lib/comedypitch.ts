import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Le ComedyPitch (13/11/2026 ; règles posées par Sarah le 12/11) : un
 * comédien se filme en jouant un personnage et dépose la vidéo depuis la
 * carte du personnage. La mécanique est celle du videopitch
 * (src/lib/videopitch.ts) ; ici, les règles propres au ComedyPitch.
 *
 * QUELS PERSONNAGES en reçoivent (la pastille verte) :
 *  - ceux d'un auteur adhérent, ou du projet CinéCrush de la semaine
 *    (gratuit « dans un premier temps », même si l'auteur n'adhère pas) ;
 *  - assez décrits pour être joués. Le critère n'a pas été fixé par Sarah :
 *    en attendant, une description d'au moins SEUIL_DESCRIPTION caractères,
 *    et n'importe quelle description pour le CinéCrush de la semaine.
 *
 * QUI dépose : un profil « comédien » qui a ouvert le projet avec un
 * soleil — ou n'importe quel comédien sur le CinéCrush de la semaine.
 * L'administration peut toujours déposer (essais, vidéo reçue autrement).
 *
 * QUI regarde : ceux qui voient la fiche en entier (l'auteur, son équipe,
 * l'administration, ceux qui ont ouvert le projet), et tous les membres
 * pendant la semaine CinéCrush du projet.
 */
export const SEUIL_DESCRIPTION = 300;

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

/** Ce projet est-il le CinéCrush de la semaine en cours ? */
export async function estLeCinecrush(admin: Admin, projectId: string): Promise<boolean> {
  const { data: dimanche } = await admin.rpc("dimanche_de_la_semaine");
  if (!dimanche) return false;
  const { data } = await admin
    .from("cinecrush")
    .select("project_id")
    .eq("semaine", dimanche as string)
    .eq("project_id", projectId)
    .maybeSingle();
  return !!data;
}

/** Le projet accepte-t-il de nouveaux ComedyPitchs ? (auteur adhérent, ou CinéCrush de la semaine) */
export async function projetAccepte(admin: Admin, projet: { id: string; owner_id: string }) {
  const [cinecrush, { data: adherent }] = await Promise.all([
    estLeCinecrush(admin, projet.id),
    admin.rpc("a_une_adhesion_active", { p_profile_id: projet.owner_id }),
  ]);
  return { cinecrush, accepte: cinecrush || adherent === true };
}

/** Ce personnage se prête-t-il à l'exercice ? */
export const assezDecrit = (description: string | null | undefined, cinecrush: boolean) => {
  const longueur = (description ?? "").trim().length;
  return cinecrush ? longueur > 0 : longueur >= SEUIL_DESCRIPTION;
};

export type AccesDepot = {
  personnage: { id: string; name: string; project_id: string };
  projet: { id: string; owner_id: string; title: string };
};

/**
 * La personne connectée peut-elle déposer un ComedyPitch pour ce
 * personnage ? Rend le personnage et son projet, ou null.
 */
export async function peutDeposerComedyPitch(
  supabase: SupabaseClient,
  userId: string,
  estAdmin: boolean,
  personnageId: string,
): Promise<AccesDepot | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: personnage } = await admin
    .from("characters")
    .select("id, name, biography, project_id")
    .eq("id", personnageId)
    .maybeSingle<{ id: string; name: string; biography: string | null; project_id: string }>();
  if (!personnage) return null;
  const { data: projet } = await admin
    .from("projects")
    .select("id, owner_id, title, is_public")
    .eq("id", personnage.project_id)
    .maybeSingle<{ id: string; owner_id: string; title: string; is_public: boolean }>();
  if (!projet) return null;
  const acces = { personnage: { id: personnage.id, name: personnage.name, project_id: personnage.project_id }, projet };
  if (estAdmin) return acces;
  if (!projet.is_public) return null;

  const { cinecrush, accepte } = await projetAccepte(admin, projet);
  if (!accepte || !assezDecrit(personnage.biography, cinecrush)) return null;

  const [{ data: comedien }, { data: ouverture }] = await Promise.all([
    admin.from("profile_roles").select("role_slug").eq("profile_id", userId).eq("role_slug", "comedien").maybeSingle(),
    supabase.from("gravity_ouvertures").select("project_id").eq("profile_id", userId).eq("project_id", projet.id).maybeSingle(),
  ]);
  if (!comedien) return null;
  return cinecrush || ouverture ? acces : null;
}

export type ComedyPitchEnLigne = {
  id: string;
  personnageId: string;
  comedienId: string;
  /** Prénom seul (Sarah, 12/11). */
  prenom: string;
  vimeoId: string;
  etoiles: number;
  /** La personne connectée a déjà envoyé son étoile filante. */
  donnee: boolean;
};

async function enLigne(
  admin: Admin,
  filtre: { colonne: "project_id" | "deposant_id"; valeur: string },
  userId: string,
): Promise<(ComedyPitchEnLigne & { projectId: string })[]> {
  const { data: depots } = await admin
    .from("videopitch_depots")
    .select("id, project_id, personnage_id, deposant_id, vimeo_id, traite_le")
    .eq("genre", "comedypitch")
    .eq("etat", "valide")
    .eq(filtre.colonne, filtre.valeur)
    .order("traite_le", { ascending: true })
    .returns<{ id: string; project_id: string; personnage_id: string; deposant_id: string; vimeo_id: string | null }[]>();
  const lignes = (depots ?? []).filter((d) => d.vimeo_id);
  if (lignes.length === 0) return [];
  const [{ data: profils }, { data: etoiles }] = await Promise.all([
    admin.from("profiles").select("id, first_name, full_name").in("id", [...new Set(lignes.map((d) => d.deposant_id))]),
    admin.from("comedypitch_etoiles").select("depot_id, profile_id").in("depot_id", lignes.map((d) => d.id)),
  ]);
  const prenoms = new Map(
    (profils ?? []).map((p) => [
      p.id as string,
      ((p.first_name as string | null)?.trim() || (p.full_name as string | null)?.trim()?.split(" ")[0] || "") as string,
    ]),
  );
  return lignes.map((d) => {
    const siennes = (etoiles ?? []).filter((e) => e.depot_id === d.id);
    return {
      id: d.id,
      projectId: d.project_id,
      personnageId: d.personnage_id,
      comedienId: d.deposant_id,
      prenom: prenoms.get(d.deposant_id) ?? "",
      vimeoId: d.vimeo_id as string,
      etoiles: siennes.length,
      donnee: siennes.some((e) => e.profile_id === userId),
    };
  });
}

/** Les ComedyPitchs en ligne d'un projet. À n'appeler que pour qui a le droit de les voir. */
export async function comedypitchsDuProjet(projectId: string, userId: string) {
  const admin = createAdminClient();
  return admin ? enLigne(admin, { colonne: "project_id", valeur: projectId }, userId) : [];
}

/** Les ComedyPitchs en ligne d'un comédien, avec le nom du personnage joué (pour son profil). */
export async function comedypitchsDuComedien(comedienId: string, userId: string) {
  const admin = createAdminClient();
  if (!admin) return [];
  const lignes = await enLigne(admin, { colonne: "deposant_id", valeur: comedienId }, userId);
  if (lignes.length === 0) return [];
  const { data: personnages } = await admin.from("characters").select("id, name").in("id", lignes.map((l) => l.personnageId));
  const noms = new Map((personnages ?? []).map((p) => [p.id as string, p.name as string]));
  return lignes.map((l) => ({ ...l, personnage: noms.get(l.personnageId) ?? "" }));
}
