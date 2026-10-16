"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./AscenseurMaison.module.css";

export type EtageMaison = {
  /** L'identifiant de la section de la page (« etage-<id> ») vers laquelle on entre. */
  id: string;
  /** Le nom de l'étage, tel qu'il est écrit sur le tableau d'appel. */
  nom: string;
  image: string;
  alt: string;
};

// Les durées, en millisecondes.
const PORTES = 750; // l'ouverture ou la fermeture des portes
const PAS_ETAGE = 340; // le temps de passer d'un étage au suivant
const DELAI_DEPART = 1200; // avant que les portes s'ouvrent, à l'arrivée sur la page
const ARRET = 4500; // le temps que la cabine reste ouverte à chaque étage pendant la visite

const attendre = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** Les portes ne s'ouvrent que quand la photo est chargée (au plus 2 s). */
const charger = (src: string) =>
  new Promise<void>((r) => {
    const image = new window.Image();
    image.onload = () => r();
    image.onerror = () => r();
    image.src = src;
    window.setTimeout(r, 2000);
  });

/**
 * L'ascenseur de la Maison des Scénaristes (16/10/2026, Sarah, d'après
 * l'« Elevator Doors Gallery » de 21st.dev) : chaque étage est une pièce
 * de la Maison — une section de la page. On choisit l'étage sur le tableau
 * d'appel, le cadran compte les étages, les portes d'acier s'ouvrent sur
 * la photo de l'étage, et « Entrer » descend à la section. À l'arrivée sur
 * la page, la cabine fait la visite toute seule, jusqu'au premier geste.
 */
export default function AscenseurMaison({ etages }: { etages: EtageMaison[] }) {
  const [affiche, setAffiche] = useState(0); // le numéro sur le cadran
  const [choisi, setChoisi] = useState(0); // l'étage derrière les portes
  const [ouvert, setOuvert] = useState(false);
  const [sens, setSens] = useState<"haut" | "bas" | null>(null);
  const [dedans, setDedans] = useState(false);
  const [visite, setVisite] = useState(true); // la visite automatique
  const [reduit, setReduit] = useState(false);
  const course = useRef(0); // le jeton de la course en cours : une nouvelle annule l'ancienne
  const position = useRef(0);
  const portesOuvertes = useRef(false);
  const reduitRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lire = () => {
      setReduit(media.matches);
      reduitRef.current = media.matches;
    };
    lire();
    media.addEventListener("change", lire);
    return () => media.removeEventListener("change", lire);
  }, []);

  const aller = useCallback(
    async (k: number) => {
      if (k < 0 || k >= etages.length) return;
      const jeton = ++course.current;
      const vivant = () => course.current === jeton;
      setDedans(false);
      if (k === position.current && portesOuvertes.current) return;
      const sansMouvement = reduitRef.current;

      if (portesOuvertes.current) {
        portesOuvertes.current = false;
        setOuvert(false);
        await attendre(sansMouvement ? 0 : PORTES);
        if (!vivant()) return;
      }

      const depart = position.current;
      const pas = k > depart ? 1 : -1;
      setSens(k > depart ? "haut" : k < depart ? "bas" : null);
      const prechargement = charger(etages[k].image);
      if (sansMouvement) {
        position.current = k;
        setAffiche(k);
      } else {
        for (let i = depart; i !== k; ) {
          i += pas;
          await attendre(PAS_ETAGE);
          if (!vivant()) return;
          position.current = i;
          setAffiche(i);
        }
      }
      setSens(null);
      setChoisi(k);
      await prechargement;
      if (!vivant()) return;
      await attendre(sansMouvement ? 0 : 250);
      if (!vivant()) return;
      portesOuvertes.current = true;
      setOuvert(true);
    },
    [etages],
  );

  // À l'arrivée : les portes s'ouvrent sur le rez-de-chaussée.
  useEffect(() => {
    const t = window.setTimeout(() => aller(0), DELAI_DEPART);
    return () => window.clearTimeout(t);
  }, [aller]);

  // La visite : un étage après l'autre, jusqu'en haut, tant que personne ne touche au tableau.
  useEffect(() => {
    // Arrivée en haut : la visite s'arrête là, portes ouvertes.
    if (!visite || !ouvert || reduit || choisi >= etages.length - 1) return;
    const t = window.setTimeout(() => aller(choisi + 1), ARRET);
    return () => window.clearTimeout(t);
  }, [visite, ouvert, reduit, choisi, etages.length, aller]);

  const choisir = (k: number) => {
    setVisite(false);
    aller(k);
  };

  const entrer = () => {
    setVisite(false);
    setDedans(true);
    const section = document.getElementById(`etage-${etages[choisi].id}`);
    window.setTimeout(() => {
      section?.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" });
    }, reduit ? 0 : 700);
  };

  const clavier = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      choisir(Math.min(etages.length - 1, position.current + 1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      choisir(Math.max(0, position.current - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      choisir(0);
    } else if (e.key === "End") {
      e.preventDefault();
      choisir(etages.length - 1);
    }
  };

  const numero = (k: number) => (k === 0 ? "RDC" : String(k).padStart(2, "0"));
  const actuel = etages[choisi];

  return (
    <div className={styles.ascenseur}>
      <div className={styles.cabine}>
        <div className={styles.cadran} aria-live="polite" aria-atomic="true">
          <span className={`${styles.fleche} ${sens === "haut" ? styles.allumee : ""}`} aria-hidden="true">
            ▲
          </span>
          <span className={styles.numero}>{numero(affiche)}</span>
          <span className={`${styles.fleche} ${sens === "bas" ? styles.allumee : ""}`} aria-hidden="true">
            ▼
          </span>
          <span className={styles.lecteurEcran}>
            {ouvert ? `${numero(choisi)} — ${actuel.nom}` : `${numero(affiche)}`}
          </span>
        </div>

        <div className={`${styles.cadre} ${ouvert ? styles.ouvert : ""} ${dedans ? styles.dedans : ""}`}>
          <div className={styles.ouverture}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={actuel.id} src={actuel.image} alt={actuel.alt} className={styles.photo} />
            <div className={styles.voile}>
              <p className={styles.nomEtage}>{actuel.nom}</p>
            </div>
          </div>
          <div className={`${styles.porte} ${styles.gauche}`} aria-hidden="true" />
          <div className={`${styles.porte} ${styles.droite}`} aria-hidden="true" />
          <div className={styles.seuil} aria-hidden="true" />
        </div>
      </div>

      <div className={styles.tableau} role="group" aria-label="Choisir un étage" onKeyDown={clavier}>
        <p className={styles.etiquette}>Choisir un étage</p>
        <ol className={styles.boutons}>
          {[...etages].reverse().map((e, i) => {
            const k = etages.length - 1 - i;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  className={`${styles.appel} ${k === choisi ? styles.allume : ""}`}
                  aria-pressed={k === choisi}
                  onClick={() => choisir(k)}
                >
                  <span className={styles.rond}>{numero(k)}</span>
                  <span className={styles.nom}>{e.nom}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <button type="button" className={styles.entrer} onClick={entrer} disabled={!ouvert}>
          Entrer
          <span className={styles.entrerOu}>{actuel.nom}</span>
        </button>
      </div>
    </div>
  );
}
