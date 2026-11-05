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

// Les autres formes d'un mot (05/11, Sarah) : singulier ⇄ pluriel et
// masculin ⇄ féminin, comme formes_du_mot dans la base (migration 0235).
// « animal » met aussi « animaux » en rouge, « acteur » « actrice ».
const GENRE: [string, string, number][] = [
  ["eur", "euse", 5], ["teur", "trice", 6], ["eux", "euse", 5], ["f", "ve", 4],
  ["euse", "eur", 6], ["euse", "eux", 6], ["trice", "teur", 7], ["ive", "if", 5],
  ["ere", "er", 6], ["ienne", "ien", 7], ["onne", "on", 6], ["elle", "el", 6],
  ["ette", "et", 6], ["ante", "ant", 7], ["ente", "ent", 7], ["ate", "at", 7], ["ine", "in", 6],
];

export function formesDuMot(w: string): string[] {
  if (!/^[a-z0-9]+$/.test(w)) return [];
  const bases = new Set([w]);
  if (/^[a-z0-9]{3,}[sx]$/.test(w)) bases.add(w.slice(0, -1));
  if (/^[a-z0-9]{2,}aux$/.test(w)) {
    bases.add(w.slice(0, -3) + "al");
    bases.add(w.slice(0, -3) + "ail");
  }
  if (/^[a-z0-9]{2,}(al|ail)$/.test(w)) bases.add(w.replace(/(al|ail)$/, "aux"));
  const formes = new Set(bases);
  for (const b of bases) {
    for (const [suf, rep, mini] of GENRE) {
      if (b.length >= mini && b.endsWith(suf)) formes.add(b.slice(0, -suf.length) + rep);
    }
  }
  formes.delete(w);
  return [...formes];
}

/** Les autres formes du mot, en mot entier (pluriel compris), ou null. */
function motifDesFormes(w: string): RegExp | null {
  const formes = formesDuMot(w);
  return formes.length ? new RegExp(`(?<![a-z0-9])(${formes.join("|")})[sx]?(?![a-z0-9])`, "g") : null;
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
    const motif = motifDesFormes(mot);
    if (motif) for (const m of norme.matchAll(motif)) marques.fill(true, m.index, m.index + m[0].length);
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
  return mots.some((m) => {
    if (!m) return false;
    if (t.includes(m)) return true;
    const motif = motifDesFormes(m);
    return motif ? motif.test(t) : false;
  });
}

/**
 * Un HTML déjà nettoyé, les mots cherchés enveloppés de
 * <mark class="mot-cherche"> (fiches de lecture, pour l'administration,
 * 02/11). Seul le texte entre les balises est touché ; les entités
 * (&amp;…) restent entières.
 */
export function surlignerHtml(html: string, mots: string[]): string {
  if (!html || !mots.length) return html;
  return html
    .split(/(<[^>]*>)/)
    .map((part) => {
      if (part.startsWith("<")) return part;
      return part
        .split(/(&[^;\s]{1,10};)/)
        .map((morceau) =>
          morceau.startsWith("&") && morceau.endsWith(";")
            ? morceau
            : decouper(morceau, mots)
                .map((m) => (m.trouve ? `<mark class="mot-cherche">${m.texte}</mark>` : m.texte))
                .join(""),
        )
        .join("");
    })
    .join("");
}
