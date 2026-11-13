"use client";

import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import IconeComedyPitch from "@/components/IconeComedyPitch";
import {
  AUCUN_PERSONNAGE,
  CHOIX_PERSONNAGE,
  FAMILLES_PERSONNAGE,
  adressePersonnages,
  nombreDeFiltresPersonnages,
  type FamillePersonnage,
  type FiltresPersonnages,
} from "./filtres-personnages";
import styles from "./projets.module.css";

/**
 * La recherche avancée des personnages (13/11/2026, Sarah), sur le modèle
 * de celle des projets : un bouton qui se déplie, une ligne de tags par
 * famille, une couleur par famille, un seul tag par famille. Ici le tag
 * choisi reste dans sa ligne, rempli, avec sa croix × pour le retirer.
 */
const COULEUR: Record<FamillePersonnage, string> = {
  role: styles.tagBleu,
  age: styles.tagJaune,
  importance: styles.tagVert,
  comedypitch: styles.tagRouge,
};

const NOM: Record<FamillePersonnage, string> = {
  role: "Rôle",
  age: "Âge",
  importance: "Importance",
  comedypitch: "ComedyPitch",
};

export default function RechercheAvanceePersonnages({ filtres: filtresDeLaPage }: { filtres: FiltresPersonnages }) {
  const router = useRouter();
  const cadre = useRef<HTMLDetailsElement>(null);
  const [, demarrer] = useTransition();
  // Le tag se remplit tout de suite, la page suit.
  const [filtres, setFiltres] = useOptimistic(filtresDeLaPage);
  // Ouvert d'office en arrivant avec un filtre.
  useEffect(() => {
    if (nombreDeFiltresPersonnages(filtresDeLaPage) > 0 && cadre.current) cadre.current.open = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- à l'arrivée seulement
  }, []);

  const appliquer = (suivants: FiltresPersonnages) => {
    demarrer(() => {
      setFiltres(suivants);
      router.push(adressePersonnages(suivants), { scroll: false });
    });
  };
  const actifs = nombreDeFiltresPersonnages(filtres);

  return (
    <details ref={cadre} className={styles.avancee}>
      <summary className={styles.avanceeBouton}>
        Recherche avancée
        {actifs > 0 && <span className={styles.avanceePastille}>{actifs}</span>}
        <span className={styles.avanceeFermer} aria-hidden="true">×</span>
      </summary>

      <div className={styles.avanceeTags}>
        {FAMILLES_PERSONNAGE.map((famille) => (
          <div key={famille} className={styles.ligneTags} role="group" aria-label={NOM[famille]}>
            {CHOIX_PERSONNAGE[famille].map((c) => {
              const choisi = filtres[famille] === c.valeur;
              const libelle = famille === "comedypitch" ? `ComedyPitch ${c.libelle.toLowerCase()}` : c.libelle;
              return (
                <button
                  key={c.valeur}
                  type="button"
                  className={`${styles.tag} ${COULEUR[famille]} ${choisi ? styles.tagChoisi : ""}`}
                  aria-pressed={choisi}
                  aria-label={choisi ? `Retirer ${libelle}` : libelle}
                  onClick={() => appliquer({ ...filtres, [famille]: choisi ? null : c.valeur })}
                >
                  {famille === "comedypitch" && (
                    <IconeComedyPitch etat={c.valeur === "disponible" ? "disponible" : "attendu"} taille={18} />
                  )}
                  {libelle}
                  {choisi && (
                    <span className={styles.tagCroix} aria-hidden="true">
                      ×
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {actifs > 0 && (
          <div className={styles.avanceeActions}>
            <button type="button" className={styles.toutEffacer} onClick={() => appliquer(AUCUN_PERSONNAGE)}>
              Tout effacer
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
