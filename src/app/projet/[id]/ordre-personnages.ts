/**
 * L'ordre des personnages d'un projet (10/10/2026, Sarah) :
 *   1. les principaux avant les secondaires ;
 *   2. ceux qui ont un nom de comédien associé ;
 *   3. pour les principaux, les femmes d'abord (ils sont peu nombreux) ;
 *      pour les secondaires, ceux qui ont une photo et une description
 *      détaillée (200 caractères au moins), puis l'un ou l'autre ;
 *   4. l'ordre de WFG 1 pour les personnages repris, sinon l'ordre de création.
 * La colonne `position` ne compte plus : personne ne peut la régler.
 */
export type PersonnageOrdonnable = {
  character_type: string | null;
  actor_name?: string | null;
  gender?: string | null;
  photo_path: string | null;
  biography: string | null;
  legacy_id?: number | string | null;
  created_at?: string | null;
};

const DESCRIPTION_DETAILLEE = 200;

function rang(p: PersonnageOrdonnable): number[] {
  const principal = p.character_type === "principal";
  const comedien = (p.actor_name ?? "").trim() ? 0 : 1;
  const troisieme = principal
    ? p.gender === "femme" ? 0 : 1
    : (p.photo_path ? 0 : 1) + ((p.biography ?? "").trim().length >= DESCRIPTION_DETAILLEE ? 0 : 1);
  const legacy = p.legacy_id == null ? Number.MAX_SAFE_INTEGER : Number(p.legacy_id);
  const cree = p.created_at ? new Date(p.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  return [principal ? 0 : 1, comedien, troisieme, legacy, cree];
}

export function ordonnerPersonnages<T extends PersonnageOrdonnable>(personnages: T[]): T[] {
  return [...personnages].sort((a, b) => {
    const ra = rang(a), rb = rang(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
    return 0;
  });
}

/**
 * L'ordre du formulaire des personnages (05/11/2026, Sarah) : un ordre fixe,
 * pour que rien ne bouge quand on ajoute une photo ou une description.
 *   1. les principaux devant, les femmes d'abord ;
 *   2. les secondaires ensuite, même mieux décrits ou avec photo ;
 *   3. à l'intérieur, l'ordre de WFG 1, sinon l'ordre de création.
 */
export function ordonnerPersonnagesFixe<T extends PersonnageOrdonnable & { id?: string }>(personnages: T[]): T[] {
  const rangFixe = (p: T): number[] => {
    const principal = p.character_type === "principal";
    const femmeDevant = principal && p.gender === "femme" ? 0 : 1;
    const legacy = p.legacy_id == null ? Number.MAX_SAFE_INTEGER : Number(p.legacy_id);
    const cree = p.created_at ? new Date(p.created_at).getTime() : Number.MAX_SAFE_INTEGER;
    return [principal ? 0 : 1, femmeDevant, legacy, cree];
  };
  return [...personnages].sort((a, b) => {
    const ra = rangFixe(a), rb = rangFixe(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
    return (a.id ?? "").localeCompare(b.id ?? "");
  });
}
