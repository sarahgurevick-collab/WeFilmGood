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
  bandeau: string | null;
  /** Équipe déjà en place : « producteur », « realisateur » ou « tous » (l'un ou l'autre). */
  equipe: string | null;
  /** Une sélection de la Maison des Scénaristes (« Cannes 2019 »). */
  selection: string | null;
  /** Un comédien ou une comédienne envisagé(e) par l'auteur. */
  comedien: string | null;
};

export const CLES: (keyof Filtres)[] = ["format", "genre", "audience", "budget", "bandeau", "equipe", "selection", "comedien"];

export const AUCUN: Filtres = { format: null, genre: null, audience: null, budget: null, bandeau: null, equipe: null, selection: null, comedien: null };

export function lireFiltres(params: Record<string, string | string[] | undefined>): Filtres {
  const lire = (cle: keyof Filtres) => {
    const v = params[cle];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.trim() ? s.trim() : null;
  };
  return { format: lire("format"), genre: lire("genre"), audience: lire("audience"), budget: lire("budget"), bandeau: lire("bandeau"), equipe: lire("equipe"), selection: lire("selection"), comedien: lire("comedien") };
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
    p_bandeau: f.bandeau,
    p_equipe: f.equipe,
    p_selection: f.selection,
    p_comedien: f.comedien,
  };
}
