import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnneeSelection } from "@/data/selectionsCannes";

/*
 * Les lignes des listes de sélection (« Titre - Auteur - Pays », ou
 * « Titre - Auteur (Pays) ») rapprochées des fiches et des profils de
 * WeFilmGood 2, à chaque affichage, par la fonction SQL
 * rapprocher_selections (migration 0194). Réservé aux membres connectés.
 */

export type LigneSelection = {
  brut: string;
  titre: string;
  auteur: string;
  /** Ce qui suit l'auteur (le pays), tel quel. */
  reste: string;
};

/** Pour une ligne : sa fiche, et le profil de chacun de ses auteurs (par nom). */
export type LienLigne = { projet?: string; membres?: Record<string, string> };
export type LiensSelection = Record<string, LienLigne>;

/* « Fabrice Pierre et Murielle Therrin », « A / B », « A, B » : un projet à
   plusieurs auteurs. Le découpage garde les séparateurs (indices impairs)
   pour réafficher la ligne telle qu'elle est écrite. */
const SEPARATEUR_AUTEURS = /(\s+(?:et|&|and)\s+|\s*\/\s*|\s*,\s*)/;

export function morceauxAuteurs(auteur: string): string[] {
  return auteur.split(SEPARATEUR_AUTEURS);
}

export function separerAuteurs(auteur: string): string[] {
  return morceauxAuteurs(auteur)
    .filter((_, i) => i % 2 === 0)
    .map((n) => n.trim())
    .filter(Boolean);
}

export function decouperLigne(brut: string): LigneSelection {
  const parts = brut.split(" - ").map((p) => p.trim());
  const titre = (parts[0] ?? "").replace(/^["«»“”]+|["«»“”]+$/g, "").trim();
  const auteurBrut = parts[1] ?? "";
  // « Rémi Bernard (France) » : le pays entre parenthèses reste affiché,
  // mais ne fait pas partie du nom.
  const parenthese = auteurBrut.match(/\s*\(.*\)\s*$/);
  const auteur = auteurBrut.replace(/\s*\(.*\)\s*$/, "").trim();
  const reste = [parenthese ? parenthese[0].trim() : "", ...parts.slice(2)]
    .filter(Boolean)
    .join(" - ");
  return { brut, titre, auteur, reste };
}

export async function rapprocherSelections(
  supabase: SupabaseClient,
  selections: AnneeSelection[],
): Promise<LiensSelection> {
  const lignes = Array.from(
    new Set(selections.flatMap((s) => s.blocs.flatMap((b) => b.entrees))),
  );
  if (lignes.length === 0) return {};
  // Une demande par auteur : chacun des co-auteurs a son lien.
  const demandes: { ligne: string; titre: string; auteur: string }[] = [];
  for (const brut of lignes) {
    const l = decouperLigne(brut);
    const auteurs = separerAuteurs(l.auteur);
    // « Rien Sans Rien (aka "Corsé") » : la fiche s'appelle « Rien Sans Rien » (26/10).
    const titre = l.titre.replace(/\s*\(aka\b[^)]*\)\s*/gi, " ").trim();
    for (const auteur of auteurs.length ? auteurs : [""]) demandes.push({ ligne: brut, titre, auteur });
  }
  const { data, error } = await supabase.rpc("rapprocher_selections", {
    lignes: demandes.map((d) => ({ titre: d.titre, auteur: d.auteur })),
  });
  if (error || !data) return {};
  const liens: LiensSelection = {};
  for (const r of data as { idx: number; project_id: string | null; profile_id: string | null }[]) {
    const d = demandes[r.idx];
    if (!d) continue;
    const lien = (liens[d.ligne] ??= {});
    if (r.project_id && !lien.projet) lien.projet = r.project_id;
    if (r.profile_id) lien.membres = { ...lien.membres, [d.auteur]: r.profile_id };
  }
  return liens;
}

/** L'ancre d'un programme dans la page du festival (« Writers-Producers
    Meetings » → « programme-writers-producers-meetings »). */
export function ancreProgramme(titre: string): string {
  const cle = titre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `programme-${cle}`;
}
