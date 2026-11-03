"use client";

import { useEffect, useRef, useState } from "react";
import formStyles from "@/components/form.module.css";
import styles from "../../blocs.module.css";
import { enregistrerUnPersonnage } from "./actions";
import { contenu } from "./contenu";

/**
 * « Tout enregistrer », en bas de la page (03/11, Sarah : « je ne sais pas si
 * j'ai enregistré », des changements perdus faute d'avoir cliqué sur le bon
 * bouton). Il envoie, un par un, chaque cadre modifié depuis l'ouverture de la
 * page, et chaque nouveau personnage qui a un nom ; puis la page se recharge
 * et chaque cadre affiche « Enregistré. ».
 *
 * Seuls les cadres modifiés partent : un personnage repris de WFG 1 peut
 * avoir une valeur absente des listes, qu'un enregistrement effacerait.
 */
export default function ToutEnregistrer({ projectId }: { projectId: string }) {
  const depart = useRef(new Map<HTMLFormElement, string>());
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    // Comme ZoneEnregistrer : on laisse aux champs le temps de se poser.
    const image = requestAnimationFrame(() => {
      document.querySelectorAll<HTMLFormElement>("form[data-personnage]").forEach((f) => {
        if (f.querySelector('input[name="character_id"]')) depart.current.set(f, contenu(f));
      });
    });
    return () => cancelAnimationFrame(image);
  }, []);

  const toutEnregistrer = async () => {
    setErreur(null);
    const aEnvoyer = Array.from(document.querySelectorAll<HTMLFormElement>("form[data-personnage]")).filter((f) => {
      const avant = depart.current.get(f);
      if (avant !== undefined) return contenu(f) !== avant;
      // Un nouveau personnage : seulement s'il a un nom (un cadre ouvert puis laissé vide est ignoré).
      const nom = f.querySelector<HTMLInputElement>('input[name="name"]')?.value.trim();
      return !!nom;
    });
    // Un nom effacé : le navigateur le signale sur le cadre concerné.
    for (const f of aEnvoyer) {
      if (!f.reportValidity()) return;
    }

    setEnvoi(true);
    for (const f of aEnvoyer) {
      const { erreur } = await enregistrerUnPersonnage(new FormData(f));
      if (erreur) {
        const nom = f.querySelector<HTMLInputElement>('input[name="name"]')?.value.trim();
        setErreur(nom ? `${nom} : ${erreur}` : erreur);
        setEnvoi(false);
        f.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // Déjà enregistré : s'il faut recommencer après une erreur, il ne repart pas.
      depart.current.set(f, contenu(f));
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
