"use client";

import styles from "../../blocs.module.css";
import { retirerPersonnage } from "./actions";

/**
 * « Retirer ce personnage » : il supprime le personnage et son portrait. Une
 * confirmation évite le clic par erreur (06/10, Sarah : « on clique sur
 * retirer le personnage alors qu'on veut d'autres portraits »).
 */
export default function BoutonRetirerPersonnage() {
  return (
    <button
      type="submit"
      formAction={retirerPersonnage}
      formNoValidate
      className={styles.lienDanger}
      onClick={(e) => {
        if (!window.confirm("Retirer ce personnage ?")) e.preventDefault();
      }}
    >
      Retirer ce personnage
    </button>
  );
}
