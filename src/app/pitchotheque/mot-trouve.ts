// Le mot qui a fait sortir un projet (02/11/2026, Sarah). Dans les
// résultats des Galaxies, on ne voyait pas pourquoi un projet remontait :
// « cabaret » trouve FRENCH CANCAN par son mot-clé, sans que le mot soit
// sur la carte. Désormais le mot tapé est en rouge dans le titre ou la
// tagline quand il y est ; sinon la carte montre, en rouge, le mot-clé qui
// l'a fait sortir (le même mot, ou un mot de sens proche), ou le mot tapé
// quand il est enfoui dans le résumé, un personnage, un comédien.
// Partagé entre le serveur (actions.ts) et la carte (Finder.tsx).

/** Minuscules sans accent, comme la fonction sans_accent de la base. */
export function sansAccent(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Les mêmes mots-outils que mots_de_recherche (migration 0114).
const MOTS_OUTILS = new Set([
  "qui", "que", "quoi", "sait", "sais", "savoir", "peut", "aime", "avec", "sans",
  "pour", "dans", "sur", "par", "des", "les", "une", "aux", "est", "sont", "ont",
  "jouer", "joue", "faire", "fait", "parle", "parler", "parlant", "bien", "tres",
  "aussi", "comme", "mais", "plus", "cherche", "recherche", "besoin", "veut",
  "son", "ses", "leur", "connait", "connaissant", "connaitre",
]);

/**
 * Les mots de la recherche, tels que tapés et normalisés : « Moulin Rouge »
 * → [moulin, rouge]. Une recherche sans mot de trois lettres (« ok ») garde
 * le texte entier.
 */
export function motsDeRecherche(q: string): { tape: string; norme: string }[] {
  const mots = q
    .trim()
    .split(/[^\p{L}\p{N}'’-]+/u)
    .map((tape) => ({ tape, norme: sansAccent(tape).replace(/[^a-z0-9]/g, "") }))
    .filter((m) => m.norme.length >= 3 && !MOTS_OUTILS.has(m.norme));
  if (mots.length) return mots;
  const entier = q.trim();
  return entier ? [{ tape: entier, norme: sansAccent(entier) }] : [];
}

/**
 * Le texte découpé en morceaux, ceux qui portent un mot cherché marqués :
 * « En face du Moulin Rouge » pour [moulin, rouge] → En face du · Moulin ·
 * espace · Rouge. Les accents du texte ne comptent pas (« féerie » pour
 * « feerie »), chaque caractère gardant sa place.
 */
export function decouper(texte: string, mots: string[]): { texte: string; trouve: boolean }[] {
  if (!texte || !mots.length) return [{ texte, trouve: false }];
  // Un caractère normalisé par caractère, pour garder les positions.
  const norme = texte
    .split("")
    .map((c) => {
      const n = sansAccent(c);
      return n.length === 1 ? n : c;
    })
    .join("");
  const marques = new Array<boolean>(texte.length).fill(false);
  for (const mot of mots) {
    if (!mot) continue;
    let depuis = 0;
    for (;;) {
      const i = norme.indexOf(mot, depuis);
      if (i < 0) break;
      marques.fill(true, i, i + mot.length);
      depuis = i + mot.length;
    }
  }
  const morceaux: { texte: string; trouve: boolean }[] = [];
  let debut = 0;
  for (let i = 1; i <= texte.length; i++) {
    if (i === texte.length || marques[i] !== marques[debut]) {
      morceaux.push({ texte: texte.slice(debut, i), trouve: marques[debut] });
      debut = i;
    }
  }
  return morceaux;
}

/** Vrai si l'un des mots cherchés est dans le texte, accents à part. */
export function contientUnMot(texte: string | null | undefined, mots: string[]): boolean {
  if (!texte) return false;
  const t = sansAccent(texte);
  return mots.some((m) => m && t.includes(m));
}
