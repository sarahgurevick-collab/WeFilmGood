"use client";

import { Fredoka } from "next/font/google";
import { useRef } from "react";
import { ENGAGEMENTS } from "@/lib/engagements";
import { useEngagement } from "@/lib/useEngagement";
import LogoComplet from "./LogoComplet";
import styles from "./PanneauEngagement.module.css";

/*
 * ESSAI (25/09/2026) — le panneau de l'accueil, en version fixe, pour la
 * moitié gauche des pages de connexion et d'inscription : le fond prend
 * la couleur de l'horloge des engagements, le logo en blanc suivi de
 * « for », et le mot de l'engagement en cours (Planet, Humanity,
 * Education) dessous — rien sur le rouge, qui est WeFilmGood tout court.
 * Page d'avant : étiquette git « connexion-avant-panneau ».
 */
const lettrage = Fredoka({ subsets: ["latin"], weight: "700" });

export default function PanneauEngagement() {
  const bloc = useRef<HTMLDivElement>(null);
  const etat = ENGAGEMENTS[useEngagement(bloc)];
  const mot = etat.mention?.replace(/^for /, "") ?? null;

  return (
    <div ref={bloc} className={`${styles.panneau} ${lettrage.className}`} aria-hidden="true">
      <div className={styles.logo}>
        <LogoComplet hauteur={200} couleur="currentColor" />
        <span className={styles.for}>for</span>
      </div>
      {/* La place du mot est réservée : le logo ne bouge pas quand il
          apparaît ou disparaît. */}
      <div className={styles.mot}>
        {mot && (
          <span key={mot} className={styles.motTexte}>
            {mot}
          </span>
        )}
      </div>
    </div>
  );
}
