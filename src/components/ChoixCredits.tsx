"use client";

import { useState } from "react";
import AvantageAdhesion from "./AvantageAdhesion";
import styles from "./ChoixCredits.module.css";

/**
 * Le choix de l'adhésion à 5 € par mois ou 50 € par an : le DÉPÔT (rouge,
 * par défaut) ou l'ACCÈS (blanc). Un seul interrupteur — celui de WFG 1,
 * piste et rond blanc — avec le mot écrit dans la piste. Les quatre
 * lignes sont toujours écrites : celles du côté choisi sont en blanc,
 * les autres en gris (02/10, mots de Sarah).
 *
 * Le choix n'est pas encore enregistré : la page présente l'offre.
 *
 * Règle voulue par Sarah : les crédits de la semaine non utilisés sont
 * perdus. L'objectif est de faire revenir les talents régulièrement,
 * pas de leur laisser tout dépenser en une fois.
 */
export default function ChoixCredits() {
  const [acces, setAcces] = useState(false);

  return (
    <>
      <li>
        <div className={styles.zone}>
          <button
            type="button"
            role="switch"
            aria-checked={acces}
            aria-label={acces ? "Accès" : "Dépôt"}
            className={`${styles.interrupteur} ${acces ? styles.cote : ""}`}
            onClick={() => setAcces((v) => !v)}
          >
            <span className={styles.mot}>{acces ? "ACCÈS" : "DÉPÔT"}</span>
            <span className={styles.rond} />
          </button>
        </div>
      </li>
      <AvantageAdhesion icone="nuage" actif={!acces}>
        L&apos;analyse d&apos;un projet de long métrage, court métrage, série ou VR/360, selon
        les modalités de dépôt.
      </AvantageAdhesion>
      <AvantageAdhesion icone="projets" actif={!acces}>
        Création de fiches projets (sans analyse du document PDF / 10 maximum)
      </AvantageAdhesion>
      <AvantageAdhesion icone="loupe" actif={acces}>
        5 crédits recherche par semaine à choisir dans la Galaxie Projets, Talents, Personnages
      </AvantageAdhesion>
      <AvantageAdhesion icone="loupe" actif={acces}>
        Les 5 crédits ne sont pas cumulables : s&apos;ils ne sont pas utilisés, ils ne peuvent
        pas être récupérés la semaine suivante.
      </AvantageAdhesion>
    </>
  );
}
