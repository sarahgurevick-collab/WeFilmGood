import { ordonnerPersonnages } from "@/app/projet/[id]/ordre-personnages";

/** Les personnages tels que la carte d'un projet les montre (14/10/2026). */
export type PersonnagesCarte = {
  total: number;
  /** Les trois premiers, dans l'ordre de la fiche. */
  portraits: { id: string; nom: string; url: string | null; cadrage: string }[];
};

/** Ce que la carte demande à la base, en plus du projet. */
export const SELECTION_PERSONNAGES =
  "characters:characters(id, name, photo_path, photo_x, photo_y, character_type, actor_name, gender, biography, legacy_id, created_at)";

export type PersonnageBrut = {
  id: string;
  name: string;
  photo_path: string | null;
  photo_x: number | null;
  photo_y: number | null;
  character_type: string | null;
  actor_name: string | null;
  gender: string | null;
  biography: string | null;
  legacy_id: number | null;
  created_at: string | null;
};

export const NB_PORTRAITS_CARTE = 3;

/** Les chemins des photos à signer pour les portraits de la carte. */
export function cheminsPortraits(personnages: PersonnageBrut[] | null | undefined): string[] {
  return ordonnerPersonnages(personnages ?? [])
    .slice(0, NB_PORTRAITS_CARTE)
    .map((c) => c.photo_path)
    .filter((c): c is string => Boolean(c));
}

export function personnagesDeLaCarte(
  personnages: PersonnageBrut[] | null | undefined,
  urlDe: { get(chemin: string): string | null | undefined },
): PersonnagesCarte | null {
  const tous = personnages ?? [];
  if (tous.length === 0) return null;
  return {
    total: tous.length,
    portraits: ordonnerPersonnages(tous)
      .slice(0, NB_PORTRAITS_CARTE)
      .map((c) => ({
        id: c.id,
        nom: c.name,
        url: c.photo_path ? (urlDe.get(c.photo_path) ?? null) : null,
        cadrage: `${c.photo_x ?? 50}% ${c.photo_y ?? 50}%`,
      })),
  };
}
