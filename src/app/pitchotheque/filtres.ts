/**
 * Les filtres de la recherche avancée : cinq menus, tous facultatifs,
 * portés par l'adresse de la page (?format=…&genre=…) pour qu'une
 * recherche se partage et se retrouve.
 */
export type Filtres = {
  format: string | null;
  genre: string | null;
  audience: string | null;
  budget: string | null;
  langue: string | null;
};

export const CLES: (keyof Filtres)[] = ["format", "genre", "audience", "budget", "langue"];

export const AUCUN: Filtres = { format: null, genre: null, audience: null, budget: null, langue: null };

export function lireFiltres(params: Record<string, string | string[] | undefined>): Filtres {
  const lire = (cle: keyof Filtres) => {
    const v = params[cle];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.trim() ? s.trim() : null;
  };
  return { format: lire("format"), genre: lire("genre"), audience: lire("audience"), budget: lire("budget"), langue: lire("langue") };
}

export function nombreDeFiltres(f: Filtres) {
  return CLES.filter((c) => f[c]).length;
}

/** La chaîne « ?format=…&page=2 » d'un lien de la pitchothèque. */
export function adresse(f: Filtres, page?: number) {
  const p = new URLSearchParams();
  for (const c of CLES) if (f[c]) p.set(c, f[c] as string);
  if (page && page > 1) p.set("page", String(page));
  const s = p.toString();
  return `/pitchotheque${s ? `?${s}` : ""}`;
}

/** Les mêmes filtres, sous la forme attendue par les fonctions de la base. */
export function parametresRpc(f: Filtres) {
  return {
    p_format: f.format,
    p_genre: f.genre,
    p_audience: f.audience,
    p_budget: f.budget,
    p_langue: f.langue,
  };
}
