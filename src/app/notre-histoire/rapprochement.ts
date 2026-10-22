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

export type LiensSelection = Record<string, { projet?: string; membre?: string }>;

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
  const decoupees = lignes.map(decouperLigne);
  const { data, error } = await supabase.rpc("rapprocher_selections", {
    lignes: decoupees.map((l) => ({ titre: l.titre, auteur: l.auteur })),
  });
  if (error || !data) return {};
  const liens: LiensSelection = {};
  for (const r of data as { idx: number; project_id: string | null; profile_id: string | null }[]) {
    const brut = lignes[r.idx];
    if (!brut) continue;
    liens[brut] = {
      ...(r.project_id ? { projet: r.project_id } : {}),
      ...(r.profile_id ? { membre: r.profile_id } : {}),
    };
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
