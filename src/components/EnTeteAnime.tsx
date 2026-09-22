"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DUREE_ENGAGEMENT, ENGAGEMENTS, ROUGE_WFG } from "@/lib/engagements";
import styles from "./EnTeteAnime.module.css";

const ETATS = ENGAGEMENTS;

const CYCLE_MS = DUREE_ENGAGEMENT;
const DELAI_APRES_SCROLL_MS = 500;

const ELEMENTS_MENU = [
  { label: "Nos appels à projets", href: "/appels-a-projets" },
  { label: "Tutoriels", href: "/tutoriels" },
  { label: "Masterclass", href: "/masterclass" },
  { label: "Festivals & Résidences", href: "/festivals-residences" },
  { label: "Témoignages", href: "/temoignages" },
  { label: "Adhésion", href: "/adhesion" },
  // Encore un concept, pas un jeu construit : « Ciné » reste fixe en
  // rouge WeFilmGood, « Fusion » suit la même horloge que le logo — les
  // trois couleurs des engagements, Planet, Humanity, Education. Un
  // battement sur quatre, les deux mots sont au rouge : la fusion.
  { label: "CinéFusion", href: "/cinefusion", special: true },
];

/**
 * Bande blanche de l'accueil. Le logo est le fichier original de la
 * marque, utilisé comme pochoir pour prendre la couleur de l'engagement
 * en cours — plus aucune reconstitution approximative.
 *
 * La bande se masque pendant le défilement pour ne pas gêner la lecture
 * des vignettes, et revient dès que ça s'arrête.
 */
export default function EnTeteAnime({ connecte }: { connecte: boolean }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOuvert) return;

    const surClicExterieur = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOuvert(false);
      }
    };

    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
  }, [menuOuvert]);

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
      <Link href="/" className={styles.lien} style={{ color: etat.couleur }}>
        <span className={styles.logo} aria-label="WeFilmGood" role="img" />
        <span className={styles.etiquetteLogo}>Accueil</span>

        {/* Même réserve de place que dans la barre noire : la mention
            change toutes les 3,6 secondes, le menu ne doit pas suivre. */}
        <span className={styles.zoneAccroche}>
          <span className={styles.gabaritAccroche} aria-hidden="true">
            for Humanity
          </span>
          {etat.mention && <span className={styles.accroche}>{etat.mention}</span>}
        </span>
      </Link>

      <nav className={styles.nav}>
        <div className={styles.menuConteneur} ref={menuRef}>
          <button
            type="button"
            className={styles.navIcone}
            aria-label="Menu"
            aria-expanded={menuOuvert}
            onClick={() => setMenuOuvert((o) => !o)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span className={styles.etiquette}>Menu</span>
          </button>

          {menuOuvert && (
            <ul className={styles.menuDeroule}>
              {ELEMENTS_MENU.map((el) => (
                <li key={el.href}>
                  <Link href={el.href} onClick={() => setMenuOuvert(false)}>
                    {"special" in el && el.special ? (
                      <>
                        <span style={{ color: ROUGE_WFG }}>Ciné</span>
                        <span style={{ color: ETATS[index].couleur }}>Fusion</span>
                      </>
                    ) : (
                      el.label
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <span className={styles.separateur} aria-hidden="true" />

        <Link
          href={connecte ? "/profil" : "/connexion"}
          className={styles.navIcone}
          aria-label={connecte ? "Mon profil" : "Connexion"}
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
          <span className={styles.etiquette}>
            {connecte ? "Mon profil" : "Connexion"}
          </span>
        </Link>
      </nav>
    </div>
  );
}
