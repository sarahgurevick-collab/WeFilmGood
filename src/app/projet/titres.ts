/**
 * Garde-fou sur le titre (10/10/2026, Sarah : « le moins d'erreur possible
 * côté talent »). Sur WFG 1, les auteurs recréaient souvent une fiche pour
 * un projet qu'ils avaient déjà ; on les prévient dès le titre.
 */

/** Minuscules, sans accents ni ponctuation : « L'Héritier » = « l heritier ». */
export function titreNormalise(titre: string): string {
  return titre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** La fiche existante dont le titre est le même, ou contient l'autre (5 lettres au moins). */
export function ficheSemblable<T extends { title: string }>(titre: string, existants: T[]): T | null {
  const t = titreNormalise(titre);
  if (t.length < 3) return null;
  return (
    existants.find((e) => {
      const n = titreNormalise(e.title);
      if (!n) return false;
      if (n === t) return true;
      return t.length >= 5 && n.length >= 5 && (n.includes(t) || t.includes(n));
    }) ?? null
  );
}
