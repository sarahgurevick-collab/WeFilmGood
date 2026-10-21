/**
 * Constantes de CinéMatch partagées entre le serveur (src/lib/cinematch.ts)
 * et le navigateur (le bouton du questionnaire) : ce fichier ne doit rien
 * importer de « server-only ».
 */

/** Il faut avoir répondu à autant de questions pour qu'un match soit calculé. */
export const MIN_REPONSES = 12;
