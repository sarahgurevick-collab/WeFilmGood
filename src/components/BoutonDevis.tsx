"use client";

import styles from "./BoutonDevis.module.css";

/**
 * « Demander un devis » : ouvre le panneau de contact du site (le rond
 * rouge en bas à droite), avec le message déjà commencé. La demande
 * arrive comme tout message de contact, par email à l'administration.
 */
export const EVENEMENT_CONTACT = "wfg:ouvrir-contact";

export default function BoutonDevis() {
  return (
    <button
      type="button"
      className={styles.bouton}
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent(EVENEMENT_CONTACT, {
            detail: {
              message:
                "Bonjour, je souhaite un devis pour une formule sur mesure. Mon besoin : ",
            },
          }),
        )
      }
    >
      Demander un devis
    </button>
  );
}
