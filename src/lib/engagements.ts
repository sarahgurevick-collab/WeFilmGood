/**
 * Les couleurs de la marque et les engagements qu'elles portent.
 *
 * Le rouge est la couleur d'origine : il ne porte aucune mention, c'est
 * WeFilmGood tout court. Les trois autres affichent leur engagement.
 *
 * Source unique, partagée par la barre de menu et l'en-tête de
 * l'accueil, qui affichaient jusqu'ici deux jeux de couleurs différents.
 */
export const ROUGE_WFG = "#DA2C25";

export const ENGAGEMENTS = [
  { couleur: ROUGE_WFG, mention: null },
  { couleur: "#35B05E", mention: "for Planet" },
  { couleur: "#F2C230", mention: "for Humanity" },
  { couleur: "#3B8EF5", mention: "for Education" },
] as const;

export const DUREE_ENGAGEMENT = 3600; // millisecondes par couleur

/**
 * Quel engagement est à l'écran pour cet élément, d'après l'animation CSS
 * « engagements » (globals.css) qui le colore — celle de la page, ou d'un
 * conteneur plus rapide. La mention (« for Planet »…) est ainsi réglée sur
 * la couleur même, au lieu d'une seconde horloge qui dériverait.
 *
 * Renvoie null si aucune animation ne tourne (moins d'animations demandé).
 */
export function engagementAffiche(element: Element): number | null {
  const animations = document
    .getAnimations()
    .filter(
      (a): a is CSSAnimation =>
        a instanceof CSSAnimation && a.animationName === "engagements" && a.playState === "running",
    );
  // L'animation du conteneur le plus proche l'emporte, comme en CSS.
  let meilleure: CSSAnimation | null = null;
  for (const a of animations) {
    const cible = (a.effect as KeyframeEffect | null)?.target;
    if (!cible || !cible.contains(element)) continue;
    if (!meilleure || ((meilleure.effect as KeyframeEffect).target as Element).contains(cible)) {
      meilleure = a;
    }
  }
  if (!meilleure) return null;
  const progres = meilleure.effect?.getComputedTiming().progress ?? 0;
  // La mention change au début du fondu, pas à la fin.
  return Math.floor((progres + 0.0625) * ENGAGEMENTS.length) % ENGAGEMENTS.length;
}
