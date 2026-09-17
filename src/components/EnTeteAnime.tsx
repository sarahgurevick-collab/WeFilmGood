"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./EnTeteAnime.module.css";

const ETATS = [
  { couleur: "#e2231a", accroche: null },
  { couleur: "#1f8a3c", accroche: "for the Planet" },
  { couleur: "#f0b400", accroche: "for Humanity" },
  { couleur: "#1b63c9", accroche: "for Education" },
] as const;

const CYCLE_MS = 4000;
const DELAI_APRES_SCROLL_MS = 500;

/**
 * Reconstitution approximative du logo réel (cercle à encoche en
 * escalier + "WE FILM GOOD") en attendant le fichier SVG source.
 * La bande se masque pendant le défilement pour ne pas gêner la
 * lecture des vignettes/bandes, et revient dès que ça s'arrête.
 */
export default function EnTeteAnime({ connecte }: { connecte: boolean }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % ETATS.length), CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const surScroll = () => {
      setVisible(false);
      if (minuteur.current) clearTimeout(minuteur.current);
      minuteur.current = setTimeout(() => setVisible(true), DELAI_APRES_SCROLL_MS);
    };

    window.addEventListener("scroll", surScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", surScroll);
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, []);

  const etat = ETATS[index];

  return (
    <div className={`${styles.bande} ${visible ? "" : styles.cachee}`}>
      <Link href="/" className={styles.lien} title="Retour à l'accueil" style={{ color: etat.couleur }}>
        <svg width="34" height="34" viewBox="0 0 100 100" aria-hidden="true">
          <mask id="encoche-entete">
            <rect width="100" height="100" fill="white" />
            <polygon points="100,38 58,38 58,58 40,58 40,78 22,78 22,100 100,100" fill="black" />
          </mask>
          <circle cx="50" cy="50" r="46" fill="currentColor" mask="url(#encoche-entete)" />
        </svg>

        <span className={styles.mot}>
          <span className={styles.ligne} style={{ marginLeft: 0 }}>We</span>
          <span className={styles.ligne} style={{ marginLeft: 10 }}>Film</span>
          <span className={styles.ligne} style={{ marginLeft: 18 }}>Good</span>
        </span>

        {etat.accroche && <span className={styles.accroche}>{etat.accroche}</span>}
      </Link>

      <nav className={styles.nav}>
        <Link href="/projets" className={styles.navLien}>
          Projets
        </Link>
        <Link href="/deposer" className={styles.navLien}>
          Déposer
        </Link>
        <Link
          href={connecte ? "/profil" : "/connexion"}
          className={styles.compte}
          aria-label={connecte ? "Mon profil" : "Connexion"}
          title={connecte ? "Mon profil" : "Connexion"}
        >
          <svg viewBox="0 0 48 48" width="26" height="26" aria-hidden="true">
            <defs>
              <clipPath id="rond-compte">
                <circle cx="24" cy="24" r="22" />
              </clipPath>
            </defs>
            <circle cx="24" cy="24" r="22" fill="#3b7fc4" />
            <g clipPath="url(#rond-compte)">
              <circle cx="24" cy="19" r="7.5" fill="#fff" />
              <path d="M9 44c0-8.5 6.5-14 15-14s15 5.5 15 14" fill="#fff" />
            </g>
          </svg>
        </Link>
      </nav>
    </div>
  );
}
