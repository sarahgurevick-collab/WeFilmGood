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
        </div>
      }
      droite={
        <div className={`${styles.panneau} ${styles.cannes}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/festivals/festival-de-cannes.png" alt="Festival de Cannes" draggable={false} />
        </div>
      }
    />
  );
}
