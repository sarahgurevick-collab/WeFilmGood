"use client";

import { useEffect, useState } from "react";
import formStyles from "@/components/form.module.css";
import styles from "../../blocs.module.css";
import { enregistrerLesModifies, noterDepart, recharger } from "./enregistrement";

/**
 * « Tout enregistrer », en bas de la page (03/11, Sarah : « je ne sais pas si
 * j'ai enregistré »). Il fait la même chose que le bouton sous chaque
 * portrait : tous les cadres modifiés partent, puis chaque cadre affiche
 * « Enregistré. ».
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
    recharger(projectId);
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
