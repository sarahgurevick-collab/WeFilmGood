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

/** Vrai si la couleur est trop sombre pour se lire sur le fond noir du site. */
function couleurTropSombre(valeur: string): boolean {
  const v = valeur.trim().toLowerCase();
  if (["black", "windowtext", "navy", "darkblue", "midnightblue"].includes(v)) return true;
  let rvb: number[] | null = null;
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, "$&$&") : hex[1];
    rvb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const rgb = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (rgb) rvb = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  if (!rvb) return false;
  // Sombre = aucune des trois composantes n'est vive. Le rouge du site
  // (#DA2C25) ou un rouge pur restent : ils se lisent sur le noir.
  return Math.max(...rvb) < 130;
}

/**
 * Un texte collé depuis Word ou un email arrive avec « couleur : noir »
 * posée sur chaque paragraphe : sur le fond noir du site, la fiche
 * devient invisible (21/11, « Martin prend son envol »). On retire donc
 * les couleurs trop sombres et les fonds collés ; les couleurs voulues
 * (le rouge des anciennes fiches) restent.
 */
function retirerCouleursIllisibles(html: string): string {
  return html.replace(/\sstyle="([^"]*)"/gi, (_, style: string) => {
    const gardees = style
      .split(";")
      .map((d) => d.trim())
      .filter((d) => {
        if (!d) return false;
        const [prop, ...reste] = d.split(":");
        const nom = prop.trim().toLowerCase();
        if (nom === "background" || nom === "background-color") return false;
        if (nom === "color") return !couleurTropSombre(reste.join(":"));
        return true;
      });
    return gardees.length ? ` style="${gardees.join("; ")}"` : "";
  });
}

export function sanitizeFiche(html: string): string {
  return retirerCouleursIllisibles(
    DOMPurify.sanitize(convertirAncienneCouleur(html), {
      ALLOWED_TAGS: BALISES,
      // "style" ne porte que de la mise en forme, et DOMPurify en nettoie
      // le contenu CSS au passage.
      ALLOWED_ATTR: ["style"],
    }),
  );
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
