"use client";

import { useState } from "react";
import styles from "../../blocs.module.css";
import { retirerPersonnage } from "./actions";
import { enregistrerLesModifies } from "./enregistrement";

/**
 * « Retirer ce personnage » : il supprime le personnage et son portrait. Une
 * confirmation évite le clic par erreur (06/10, Sarah : « on clique sur
 * retirer le personnage alors qu'on veut d'autres portraits »).
 *
 * Retirer recharge la page : les changements des autres cadres sont
 * enregistrés avant, pour ne pas les perdre (03/11).
 */
export default function BoutonRetirerPersonnage() {
  const [envoi, setEnvoi] = useState(false);
  return (
    <button
      type="button"
      className={styles.lienDanger}
      disabled={envoi}
      onClick={async (e) => {
        const form = e.currentTarget.closest("form");
        if (!form || !window.confirm("Retirer ce personnage ?")) return;
        setEnvoi(true);
        const echec = await enregistrerLesModifies(form);
        if (echec) {
          window.alert(echec);
          setEnvoi(false);
          return;
        }
        await retirerPersonnage(new FormData(form));
      }}
    >
      Retirer ce personnage
    </button>
  );
}
