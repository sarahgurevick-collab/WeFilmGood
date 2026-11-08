/**
 * La langue du globe lue côté serveur, d'après la valeur du cookie
 * « googtrans » (celui du module Google Traduction). Fichier à part de
 * langue-globe.ts, qui s'appuie sur React côté navigateur et ne peut pas
 * être importé par un composant serveur.
 */
export type LangueGlobe = "fr" | "en";

export function langueDuCookie(valeur: string | undefined): LangueGlobe {
  return valeur && /\/en(-[a-zA-Z]+)?$/i.test(valeur) ? "en" : "fr";
}
