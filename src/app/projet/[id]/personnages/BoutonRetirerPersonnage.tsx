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
        // Le retrait ne part qu'avec ce qui désigne le personnage : pas le
        // portrait ni les autres champs du cadre (13/11).
        const quoi = new FormData();
        for (const nom of ["project_id", "character_id"]) quoi.set(nom, String(new FormData(form).get(nom) ?? ""));
        try {
          const echec = await enregistrerLesModifies(form);
          if (echec) {
            window.alert(echec);
            setEnvoi(false);
            return;
          }
          await retirerPersonnage(quoi);
        } catch (erreur) {
          // Une redirection de Next passe par ici : elle n'est pas une erreur.
          if (erreur && typeof erreur === "object" && "digest" in erreur && String(erreur.digest).startsWith("NEXT_REDIRECT")) throw erreur;
          // Avant le 13/11, un échec ici ne disait rien : le bouton restait grisé.
          window.alert("Le personnage n'a pas pu être retiré. Réessayez, ou écrivez-nous.");
          setEnvoi(false);
        }
      }}
    >
      Retirer ce personnage
    </button>
  );
}
