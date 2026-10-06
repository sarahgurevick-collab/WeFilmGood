"use client";

import styles from "./portraits.module.css";

/** Le bouton « Retirer », avec une confirmation : la photo est enlevée du site. */
export default function BoutonRetirer() {
  return (
    <button
      type="submit"
      className={styles.retirer}
      onClick={(e) => {
        if (!window.confirm("Retirer ce portrait ?")) e.preventDefault();
      }}
    >
      Retirer
    </button>
  );
}
