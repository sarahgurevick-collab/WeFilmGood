/**
 * Les filtres de la recherche avancée des personnages (13/11/2026, Sarah) :
 * quatre familles, toutes facultatives, portées par l'adresse de la page
 * (?voir=personnages&role=…&age=…) pour qu'une recherche se retrouve.
 */
export type FamillePersonnage = "role" | "age" | "importance" | "comedypitch";

export type FiltresPersonnages = Record<FamillePersonnage, string | null>;

export const FAMILLES_PERSONNAGE: FamillePersonnage[] = ["role", "age", "importance", "comedypitch"];

export const AUCUN_PERSONNAGE: FiltresPersonnages = { role: null, age: null, importance: null, comedypitch: null };

/** Les choix de chaque famille, dans l'ordre d'affichage (libellés validés par Sarah le 13/11). */
export const CHOIX_PERSONNAGE: Record<FamillePersonnage, { valeur: string; libelle: string }[]> = {
  role: [
    { valeur: "homme", libelle: "Homme" },
    { valeur: "femme", libelle: "Femme" },
  ],
  age: [
    { valeur: "enfant", libelle: "Enfant" },
    { valeur: "adolescent", libelle: "Adolescent" },
    { valeur: "adulte", libelle: "Adulte" },
    { valeur: "senior", libelle: "Senior" },
  ],
  importance: [
    { valeur: "principal", libelle: "Principal" },
    { valeur: "secondaire", libelle: "Secondaire" },
  ],
  comedypitch: [
    { valeur: "attendu", libelle: "Attendu" },
    { valeur: "disponible", libelle: "Disponible" },
  ],
};

/** Ne garde que les valeurs connues : l'adresse et les appels du navigateur ne sont pas sûrs. */
export function lireFiltresPersonnages(params: Record<string, unknown> | null | undefined): FiltresPersonnages {
  const lire = (famille: FamillePersonnage) => {
    const v = params?.[famille];
    const s = Array.isArray(v) ? v[0] : v;
    return typeof s === "string" && CHOIX_PERSONNAGE[famille].some((c) => c.valeur === s) ? s : null;
  };
  return { role: lire("role"), age: lire("age"), importance: lire("importance"), comedypitch: lire("comedypitch") };
}

export function nombreDeFiltresPersonnages(f: FiltresPersonnages) {
  return FAMILLES_PERSONNAGE.filter((c) => f[c]).length;
}

/** « /galaxies?voir=personnages&role=femme » */
export function adressePersonnages(f: FiltresPersonnages) {
  const p = new URLSearchParams({ voir: "personnages" });
  for (const c of FAMILLES_PERSONNAGE) if (f[c]) p.set(c, f[c] as string);
  return `/galaxies?${p.toString()}`;
}

/** Les mêmes filtres, sous la forme attendue par la fonction galaxie_personnages. */
export function parametresRpcPersonnages(f: FiltresPersonnages) {
  return { p_role: f.role, p_age: f.age, p_importance: f.importance, p_comedypitch: f.comedypitch };
}
