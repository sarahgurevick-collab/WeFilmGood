import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { calculerCompletion } from "@/app/profil/completion";
import { nomDuPays } from "@/lib/pays";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * CinéMatch : les vingt questions « si j'étais… » et le meilleur match
 * (le profil qui a le plus de réponses identiques). Voir la migration 0175.
 */

export type Reponses = Record<string, string>;

import { MIN_REPONSES } from "@/lib/cinematch-constantes";

export { MIN_REPONSES };

const COOKIE_BROUILLON = "cinematch";
const DUREE_BROUILLON_S = 7 * 24 * 60 * 60;

/**
 * Lit les réponses d'un formulaire : liste (`q_cle`) et champ libre
 * (`q_cle_autre`, enregistré « autre:… » en minuscules, comme les réponses
 * reprises de WFG 1 — c'est ce qui permet de rapprocher deux membres).
 * `plafond` borne le texte libre.
 */
export function reponsesDuFormulaire(formData: FormData, cles: string[], plafond = 200): Reponses {
  const lire = (nom: string) => ((formData.get(nom) as string | null) ?? "").trim();
  const reponses: Reponses = {};
  for (const cle of cles) {
    const libre = lire(`q_${cle}_autre`);
    const liste = lire(`q_${cle}`);
    if (libre) reponses[cle] = "autre:" + libre.toLowerCase().slice(0, plafond);
    else if (liste) reponses[cle] = liste.slice(0, 100);
  }
  return reponses;
}

/**
 * Les réponses d'un visiteur sans compte attendent dans un cookie, le temps
 * de lui demander son adresse email : rien n'est écrit dans la base avant.
 * Tant qu'il est là (7 jours), le visiteur ne peut pas refaire le jeu pour
 * gonfler son match : les réponses sont mémorisées, pas modifiables.
 * Le cookie ne dépasse pas 4 Ko : on borne le texte libre à 80 caractères.
 */
export const PLAFOND_TEXTE_VISITEUR = 80;

export async function garderBrouillon(reponses: Reponses) {
  const jar = await cookies();
  jar.set(COOKIE_BROUILLON, Buffer.from(JSON.stringify(reponses)).toString("base64url"), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/cinematch",
    maxAge: DUREE_BROUILLON_S,
  });
}

export async function lireBrouillon(): Promise<Reponses | null> {
  const jar = await cookies();
  const brut = jar.get(COOKIE_BROUILLON)?.value;
  if (!brut) return null;
  try {
    const valeur = JSON.parse(Buffer.from(brut, "base64url").toString("utf8"));
    if (!valeur || typeof valeur !== "object" || Array.isArray(valeur)) return null;
    const reponses: Reponses = {};
    for (const [cle, v] of Object.entries(valeur)) {
      if (typeof v === "string" && v) reponses[cle] = v.slice(0, 120);
    }
    return Object.keys(reponses).length > 0 ? reponses : null;
  } catch {
    return null;
  }
}

export async function oublierBrouillon() {
  const jar = await cookies();
  jar.delete({ name: COOKIE_BROUILLON, path: "/cinematch" });
}

export type Match = {
  profileId: string;
  pourcentage: number;
  communes: number;
  comparees: number;
  /** « Producteur », « Scénariste »… et le pays : les seuls indices sans adhésion. */
  metier: string | null;
  pays: string | null;
};

/** Le meilleur match de ces réponses, ou null s'il y en a trop peu pour comparer. */
export async function meilleurMatch(reponses: Reponses, exclure?: string): Promise<Match | null> {
  if (Object.keys(reponses).length < MIN_REPONSES) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("cinematch_meilleurs", {
    p_reponses: reponses,
    p_exclure: exclure ?? null,
    p_limite: 1,
  });
  if (error) {
    console.error("CinéMatch : calcul du match impossible", error.message);
    return null;
  }
  const ligne = (
    data as
      | { profile_id: string; pourcentage: number; communes: number; comparees: number; metier: string | null; pays: string | null }[]
      | null
  )?.[0];
  return ligne
    ? {
        profileId: ligne.profile_id,
        pourcentage: ligne.pourcentage,
        communes: ligne.communes,
        comparees: ligne.comparees,
        metier: ligne.metier,
        pays: nomDuPays(ligne.pays),
      }
    : null;
}

export type ResultatCineMatch = {
  reponses: Reponses;
  nbReponses: number;
  /** Assez de réponses (12) pour qu'un match soit calculé. */
  assez: boolean;
  match: Match | null;
  adherent: boolean;
  /** Profil complété à 100 % : avec l'adhésion, donne droit au nom et à la photo nette. */
  complet: boolean;
  category: string | null;
  nom: string | null;
  /** La photo du match : nette si le nom est visible, floutée sinon (même règle que la Galaxie de Talents, 02/10). */
  photo: string | null;
  /** Les questions où la personne et son match ont donné la même réponse. */
  questionsMatchees: string[];
};

/**
 * Tout ce que la page CinéMatch et le bloc 3 du profil montrent à un membre
 * connecté : ses réponses, son meilleur match, et ce qu'il a le droit d'en
 * voir (21/10/2026, Sarah : photo, réponses communes mises en couleur).
 */
export async function resultatCineMatch(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResultatCineMatch> {
  const [{ data: fiche }, { data: adhesion }, completion] = await Promise.all([
    supabase.from("profiles").select("personality_answers, category").eq("id", userId).maybeSingle(),
    supabase.rpc("a_une_adhesion_active", { p_profile_id: userId }),
    calculerCompletion(supabase, userId),
  ]);
  const reponses = (fiche?.personality_answers ?? {}) as Reponses;
  const nbReponses = Object.keys(reponses).length;
  const assez = nbReponses >= MIN_REPONSES;
  const adherent = adhesion === true;
  const complet = completion.pourcent === 100;
  const match = assez ? await meilleurMatch(reponses, userId) : null;

  let nom: string | null = null;
  let photo: string | null = null;
  let questionsMatchees: string[] = [];
  const admin = createAdminClient();
  if (match && admin) {
    const { data: leMatch } = await admin
      .from("profiles")
      .select("full_name, first_name, avatar_url, personality_answers")
      .eq("id", match.profileId)
      .maybeSingle();
    const siennes = (leMatch?.personality_answers ?? {}) as Reponses;
    questionsMatchees = Object.keys(reponses).filter((k) => siennes[k] === reponses[k]);
    const nomVisible = adherent && complet;
    if (nomVisible) nom = leMatch?.full_name ?? leMatch?.first_name ?? null;
    if (leMatch?.avatar_url) {
      photo = nomVisible ? leMatch.avatar_url : `/api/talents/photo?id=${match.profileId}`;
    }
  }

  return {
    reponses,
    nbReponses,
    assez,
    match,
    adherent,
    complet,
    category: (fiche?.category as string | null) ?? null,
    nom,
    photo,
    questionsMatchees,
  };
}
