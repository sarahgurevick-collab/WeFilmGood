"use client";

import ComparateurFestivals from "@/components/ComparateurFestivals";
import { EVENEMENT_FORMAT } from "@/components/SwitchFormat";
import styles from "./comparateur.module.css";

/*
 * ESSAI (24/09/2026) : Clermont-Ferrand (court métrage) et Cannes (long
 * métrage) dans le même cadre. Tirer la barre vers un festival affiche
 * son format dessous. La page d'avant est gardée sous l'étiquette git
 * « appels-a-projets-avant-essai ».
 */
export default function ComparateurAppels() {
  return (
    <ComparateurFestivals
      etiquettes={["Court-métrage", "Long-métrage"]}
      onCote={(cote) =>
        window.dispatchEvent(
          new CustomEvent(EVENEMENT_FORMAT, { detail: cote === "gauche" ? "court" : "long" }),
        )
      }
      gauche={
        <div className={`${styles.panneau} ${styles.clermont}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/festivals/clermont-ferrand.jpg" alt="Festival du court métrage de Clermont-Ferrand" draggable={false} />
          {/* Le texte occupe la partie laissée libre par le logo : noir sur
              blanc pour Clermont. Même texte que plus bas sur la page. */}
          <div className={styles.texte}>
            <p className={styles.titre}>Festival de Clermont-Ferrand 2026 — appel à projets</p>
            <p className={styles.mention}>(édition précédente, à mettre à jour)</p>
            <p>
              La Maison des Scénaristes et WeFilmGood, en partenariat avec le 48e Festival
              International du Court Métrage de Clermont-Ferrand, organisent des rencontres
              auteurs-producteurs pendant le festival 2026. Les auteurs sélectionnés rencontrent des
              producteurs lors de rendez-vous individuels.
            </p>
            <p className={styles.date}>Date limite : 8 novembre 2025 à 23h59 (heure française)</p>
          </div>
        </div>
      }
      droite={
        <div className={`${styles.panneau} ${styles.cannes}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* Blanc sur noir pour Cannes, à gauche du logo. */}
          <div className={styles.texte}>
            <p className={styles.titre}>
              Festival de Cannes 2026 — appel à pitchs long métrage (« Les Pitchs sans frontières »,
              3e édition)
            </p>
            <p>
              La Maison des Scénaristes et WeFilmGood lancent la 3e édition des « Pitchs sans
              frontières », un appel à projets international de longs métrages francophones ou
              anglophones. Les auteurs sélectionnés pitcheront leur projet aux professionnels au
              Marché du Film du Festival de Cannes 2026 lors d&apos;une présentation en direct.
            </p>
            <p className={styles.date}>Date limite : 10 mars 2026 à 23h59 (heure française)</p>
          </div>
          <img src="/festivals/festival-de-cannes.png" alt="Festival de Cannes" draggable={false} />
        </div>
      }
    />
  );
}
