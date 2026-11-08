import { useSyncExternalStore } from "react";

/**
 * La langue choisie avec le globe (Google Traduction, cookie « googtrans »).
 *
 * La traduction automatique traduit la page au chargement, mais pas ce qui
 * change ensuite : les bulles de la visite guidée, le mot du bouton des
 * galaxies ou des thèmes de mots-clés (animé lettre par lettre, elle le
 * déforme : « Personnhases », « styLes »). Ces textes-là portent donc leur
 * propre version anglaise, choisie d'après ce cookie, et sont marqués
 * « notranslate » pour que Google n'y touche plus (08/11).
 */
export type LangueGlobe = "fr" | "en";

export function langueDuGlobe(): LangueGlobe {
  if (typeof document === "undefined") return "fr";
  const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[a-z-]+\/([a-zA-Z-]+)/);
  return m && m[1].toLowerCase().startsWith("en") ? "en" : "fr";
}

// Le cookie ne change qu'avec un rechargement : rien à écouter.
const sAbonner = () => () => {};

/** La langue du globe dans un composant client ; « fr » côté serveur. */
export function useLangueDuGlobe(): LangueGlobe {
  return useSyncExternalStore(sAbonner, langueDuGlobe, () => "fr" as const);
}
