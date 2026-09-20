/**
 * Le taux de remplissage d'une fiche projet, et la prochaine chose à
 * faire pour l'améliorer.
 *
 * Sur l'ancienne plateforme, les fiches bien remplies remontaient dans
 * la pitchothèque, et les auteurs le savaient : il y avait un enjeu à
 * soigner sa fiche. Le classement y pesait surtout le videopitch (+18
 * points sur 51) et les fiches personnages (+11), deux choses que
 * WeFilmGood 2 ne permet pas encore de saisir. Les poids ci-dessous ne
 * portent donc que sur ce qu'un auteur peut réellement remplir
 * aujourd'hui ; ils s'étendront quand ces écrans existeront.
 *
 * Une seule action est proposée à la fois : les auteurs ne lisent pas
 * les listes, ni les tutoriels. On les prend par la main, marche après
 * marche.
 */
export type EtatFiche = {
  titre: string | null;
  tagline: string | null;
  logline: string | null;
  genre: string | null;
  format: string | null;
  aUneVignette: boolean;
  aUnScenario: boolean;
};

type Critere = {
  cle: string;
  poids: number;
  rempli: boolean;
  manque: string;
};

export function criteres(f: EtatFiche): Critere[] {
  return [
    {
      cle: "tagline",
      poids: 20,
      rempli: (f.tagline ?? "").trim().length > 0,
      manque: "Votre tagline — la phrase d'accroche qui donne envie de lire la suite.",
    },
    {
      cle: "logline",
      poids: 20,
      rempli: (f.logline ?? "").trim().length > 0,
      manque: "Votre logline — le petit résumé de l'histoire, en quelques phrases.",
    },
    {
      cle: "vignette",
      poids: 20,
      rempli: f.aUneVignette,
      manque: "Une image de présentation. Sans elle, votre projet passe inaperçu dans la liste.",
    },
    {
      cle: "scenario",
      poids: 20,
      rempli: f.aUnScenario,
      manque: "Votre scénario en PDF. Il reste confidentiel : seuls vous, le lecteur chargé de votre projet et l'administration y ont accès.",
    },
    {
      cle: "genre",
      poids: 10,
      rempli: (f.genre ?? "").trim().length > 0,
      manque: "Le genre de votre film.",
    },
    {
      cle: "format",
      poids: 10,
      rempli: (f.format ?? "").trim().length > 0,
      manque: "Le format — long métrage, court métrage, série…",
    },
  ];
}

export function tauxDeRemplissage(f: EtatFiche): number {
  const liste = criteres(f);
  const total = liste.reduce((n, c) => n + c.poids, 0);
  const acquis = liste.reduce((n, c) => n + (c.rempli ? c.poids : 0), 0);
  return Math.round((acquis / total) * 100);
}

/** La seule chose à faire maintenant — la plus lourde d'abord. */
export function prochaineAction(f: EtatFiche): string | null {
  const manquants = criteres(f)
    .filter((c) => !c.rempli)
    .sort((a, b) => b.poids - a.poids);
  return manquants[0]?.manque ?? null;
}
