"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import styles from "../../blocs.module.css";

/**
 * Le « + » du bas de la page (07/10) : la fiche vide n'est plus affichée à la
 * fin de la liste, elle s'ouvre quand on clique. Sans aucun personnage, elle
 * est ouverte d'emblée.
 *
 * Chaque clic ouvre une fiche vide de plus (03/11, Sarah : créer plusieurs
 * personnages, puis « Tout enregistrer » à la fin). Une fiche ouverte par
 * erreur se referme avec « Retirer ce personnage » (04/11), et « Tout
 * enregistrer » est sur la même ligne que le « + », à droite (04/11, Sarah).
 */
const RetirerFiche = createContext<(() => void) | null>(null);

export default function AjouterPersonnage({
  ouvertDemblee,
  children,
  aDroite,
}: {
  ouvertDemblee: boolean;
  children: ReactNode;
  /** Posé sur la ligne du « + », à droite : « Tout enregistrer ». */
  aDroite?: ReactNode;
}) {
  const suivant = useRef(1);
  const [fiches, setFiches] = useState<number[]>(ouvertDemblee ? [0] : []);
  return (
    <>
      {fiches.length > 0 && (
        <div className={styles.liste}>
          {fiches.map((cle) => (
            <RetirerFiche.Provider key={cle} value={() => setFiches((f) => f.filter((c) => c !== cle))}>
              {children}
            </RetirerFiche.Provider>
          ))}
        </div>
      )}
      <div className={styles.ligneAjouter}>
        <button
          type="button"
          className={styles.boutonPlus}
          onClick={() => setFiches((f) => [...f, suivant.current++])}
        >
          <span className={styles.plus} aria-hidden="true">
            +
          </span>
          Ajouter un personnage
        </button>
        {aDroite}
      </div>
    </>
  );
}

/** Sur une fiche pas encore enregistrée : la referme, sans rien enregistrer. */
export function RetirerFicheVide() {
  const retirer = useContext(RetirerFiche);
  if (!retirer) return null;
  return (
    <button type="button" className={styles.lienDanger} onClick={retirer}>
      Retirer ce personnage
    </button>
  );
}
