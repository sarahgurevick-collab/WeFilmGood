"use client";

import { useEffect, useState } from "react";
import formStyles from "@/components/form.module.css";
import styles from "../../blocs.module.css";
import { enregistrerLesModifies, noterDepart } from "./enregistrement";

/**
 * « Tout enregistrer », le seul bouton d'enregistrement de la page, fixé en
 * bas de l'écran (03/11, Sarah : un bouton par personnage faisait perdre les
 * changements des autres cadres, la page se rechargeant). Après
 * l'enregistrement, la page se recharge et chaque cadre affiche « Enregistré. ».
 */
export default function ToutEnregistrer({ projectId }: { projectId: string }) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    // Comme ZoneEnregistrer : on laisse aux champs le temps de se poser.
    const image = requestAnimationFrame(noterDepart);
    return () => cancelAnimationFrame(image);
  }, []);

  const toutEnregistrer = async () => {
    setErreur(null);
    setEnvoi(true);
    const echec = await enregistrerLesModifies();
    if (echec) {
      setErreur(echec);
      setEnvoi(false);
      return;
    }
    // Rechargement complet voulu : les fiches vides ouvertes avec « + » doivent disparaître.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/projet/${projectId}/personnages?enregistre=tous`);
  };

  return (
    <div className={styles.toutEnregistrer}>
      {erreur && <p className={formStyles.error}>{erreur}</p>}
      <button type="button" className={formStyles.submit} disabled={envoi} onClick={toutEnregistrer}>
        {envoi ? "Enregistrement…" : "Tout enregistrer"}
      </button>
    </div>
  );
}
