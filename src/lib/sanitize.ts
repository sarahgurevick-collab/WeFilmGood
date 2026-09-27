import DOMPurify from "isomorphic-dompurify";

/**
 * Nettoie le HTML d'une fiche de lecture avant enregistrement.
 *
 * Ce texte est rédigé par un lecteur puis affiché dans le navigateur de
 * l'administratrice et de l'auteur. Sans filtrage, un contenu piégé —
 * collé volontairement ou hérité d'un document vérolé — s'exécuterait
 * dans une session d'administration. On ne conserve donc que les
 * balises de mise en forme attendues.
 */
const BALISES = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "span",
];

/**
 * L'ancienne plateforme colorait le texte avec <font color="red">, une
 * balise abandonnée que les éditeurs modernes suppriment sans prévenir —
 * la couleur de dix ans de fiches disparaîtrait au premier enregistrement.
 * On la traduit donc vers son équivalent actuel avant tout traitement.
 * Ce qui échapperait à cette conversion est de toute façon écarté ensuite
 * par le nettoyage.
 */
function convertirAncienneCouleur(html: string): string {
  return html
    .replace(
      /<font\b[^>]*\bcolor\s*=\s*["']?([#\w]+)["']?[^>]*>/gi,
      (_, couleur) => `<span style="color:${couleur}">`,
    )
    .replace(/<\/font\s*>/gi, "</span>");
}

export function sanitizeFiche(html: string): string {
  return DOMPurify.sanitize(convertirAncienneCouleur(html), {
    ALLOWED_TAGS: BALISES,
    // "style" ne porte que de la mise en forme, et DOMPurify en nettoie
    // le contenu CSS au passage.
    ALLOWED_ATTR: ["style"],
  });
}

/**
 * Une fiche reprise de WFG 1 : du texte à retours à la ligne, semé de
 * balises (<u>, <b>, <font color>…) que l'ancien site interprétait. On
 * les interprète aussi — le soulignement et le gras réapparaissent, les
 * signes disparaissent — au lieu de les afficher tels quels (27/09).
 */
export function ficheHeriteeEnHtml(texte: string | null): string {
  if (!texte) return "";
  return sanitizeFiche(texte.replace(/\r\n?/g, "\n").replace(/\n/g, "<br>"));
}

/** Vrai si la fiche ne contient que des balises vides ou des espaces. */
export function ficheEstVide(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length === 0;
}
