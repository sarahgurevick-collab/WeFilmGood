/**
 * Constantes de CinéMatch partagées entre le serveur (src/lib/cinematch.ts)
 * et le navigateur (le bouton du questionnaire) : ce fichier ne doit rien
 * importer de « server-only ».
 */

/** Il faut avoir répondu à autant de questions pour qu'un match soit calculé. */
export const MIN_REPONSES = 12;

/**
 * Une réponse libre est stockée sous sa forme de comparaison (« etranger -
 * albert camus »). Sans libellé posé (table personality_libre_libelles), on
 * l'écrit au moins avec une majuscule au début, et une à chaque mot après le
 * tiret, là où se trouve d'ordinaire un nom d'auteur (21/10/2026, Sarah :
 * « il faut les afficher correctement »).
 */
export function joliLibelle(texte: string): string {
  const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const [titre, ...reste] = texte.split(" - ");
  return [majuscule(titre), ...reste.map((r) => r.split(" ").map(majuscule).join(" "))].join(" - ");
}
