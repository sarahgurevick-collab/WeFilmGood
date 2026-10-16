"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./AscenseurMaison.module.css";

import type { EtageAssociation as EtageMaison } from "@/data/association";

// Les durées, en millisecondes.
const PORTES = 750; // l'ouverture ou la fermeture des portes
const PAS_ETAGE = 340; // le temps de passer d'un étage au suivant
const DELAI_DEPART = 1200; // avant que les portes s'ouvrent, à l'arrivée sur la page
const ARRET = 4500;
const ZOOM = 650; // la photo qui grandit jusqu'au bord du boîtier, ou qui revient // le temps que la cabine reste ouverte à chaque étage pendant la visite

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
 *
 * 16/10, retour de Sarah : l'ascenseur est posé sur un lagon aux palmiers,
 * sans cadre gris autour, plus petit, avec à côté la zone de texte de
 * l'étage (le titre de la section et une phrase de la page).
 *
 * Comme dans l'original : l'ascenseur tient dans un petit boîtier (cadran,
 * portes, plaque d'appel) ; « Entrer », écrit sur la photo comme le
 * « Step inside » de l'original (ou à côté, ou un clic sur la photo), la
 * fait grandir jusqu'à remplir tout le boîtier, l'ascenseur s'assombrit
 * derrière ; un clic n'importe où, la croix × ou Échap ramène à
 * l'ascenseur. Le titre de la zone de texte descend à la section.
 */
export default function AscenseurMaison({ etages }: { etages: EtageMaison[] }) {
  const [affiche, setAffiche] = useState(0); // le numéro sur le cadran
  const [choisi, setChoisi] = useState(0); // l'étage derrière les portes
  const [ouvert, setOuvert] = useState(false);
  const [sens, setSens] = useState<"haut" | "bas" | null>(null);
  // La photo en grand dans le boîtier : « depart » = posée sur les portes,
  // « grand » = tout le boîtier, « retour » = elle revient sur les portes.
  const [zoom, setZoom] = useState<"non" | "depart" | "grand" | "retour">("non");
  const [place, setPlace] = useState({ top: 0, left: 0, right: 0, bottom: 0 });
  const boitier = useRef<HTMLDivElement | null>(null);
  const baie = useRef<HTMLButtonElement | null>(null);
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

  const descendre = () => {
    setVisite(false);
    document
      .getElementById(`etage-${etages[choisi].id}`)
      ?.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" });
  };

  // La place des portes dans le boîtier : c'est de là que la photo part et là qu'elle revient.
  const mesurer = () => {
    const b = boitier.current?.getBoundingClientRect();
    const o = baie.current?.getBoundingClientRect();
    if (!b || !o) return;
    setPlace({ top: o.top - b.top, left: o.left - b.left, right: b.right - o.right, bottom: b.bottom - o.bottom });
  };

  const agrandir = () => {
    if (!ouvert) return;
    setVisite(false);
    mesurer();
    if (reduit) {
      setZoom("grand");
      return;
    }
    setZoom("depart");
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setZoom("grand")));
  };

  const revenir = () => {
    if (reduit) {
      setZoom("non");
      return;
    }
    mesurer();
    setZoom("retour");
    window.setTimeout(() => setZoom((z) => (z === "retour" ? "non" : z)), ZOOM);
  };

  // Échap ramène à l'ascenseur.
  useEffect(() => {
    if (zoom !== "grand") return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") revenir();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  });

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
  // Le tableau d'appel comme dans un vrai ascenseur : deux colonnes, le
  // rez-de-chaussée en bas à gauche, le dernier étage en haut.
  const rangees: number[][] = [];
  for (let k = 0; k < etages.length; k += 2) rangees.unshift(k + 1 < etages.length ? [k, k + 1] : [k]);

  return (
    <section className={styles.lagon} aria-label="L'ascenseur de la Maison">
      <div className={styles.scene}>
        <div className={`${styles.ascenseur} ${zoom === "depart" || zoom === "grand" ? styles.assombri : ""}`} ref={boitier}>
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

            <div className={`${styles.cadre} ${ouvert ? styles.ouvert : ""}`}>
              <button
                ref={baie}
                type="button"
                className={styles.ouverture}
                onClick={agrandir}
                disabled={!ouvert}
                aria-label={`Entrer : ${actuel.nom}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img key={actuel.id} src={actuel.image} alt={actuel.alt} className={styles.photo} />
                <span className={styles.legende} aria-hidden="true">
                  <span className={styles.legendeNumero}>{numero(choisi)}</span>
                  <span className={styles.legendeNom}>{actuel.nom}</span>
                  <span className={styles.legendeEntrer}>Entrer ↗</span>
                </span>
              </button>
              <div className={`${styles.porte} ${styles.gauche}`} aria-hidden="true" />
              <div className={`${styles.porte} ${styles.droite}`} aria-hidden="true" />
            </div>
          </div>

          <div className={styles.plaque} role="group" aria-label="Choisir un étage" onKeyDown={clavier}>
            {rangees.map((rangee) =>
              rangee.map((k) => (
                <button
                  key={etages[k].id}
                  type="button"
                  className={`${styles.appel} ${k === choisi ? styles.allume : ""}`}
                  aria-pressed={k === choisi}
                  aria-label={`${numero(k)} — ${etages[k].nom}`}
                  title={etages[k].nom}
                  onClick={() => choisir(k)}
                >
                  {numero(k)}
                </button>
              )),
            )}
          </div>

          {zoom !== "non" && (
            <div
              className={`${styles.grand} ${zoom === "grand" ? styles.plein : ""}`}
              style={zoom === "grand" ? { top: 0, left: 0, right: 0, bottom: 0 } : place}
              onClick={revenir}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={actuel.image} alt={actuel.alt} className={zoom === "grand" ? styles.lent : ""} />
              <div className={`${styles.grandLegende} ${zoom === "grand" ? styles.visible : ""}`}>
                <p className={styles.legendeNumero}>{numero(choisi)}</p>
                <p className={styles.grandNom}>{actuel.titre}</p>
                {actuel.texte && <p className={styles.grandPhrase}>{actuel.texte}</p>}
              </div>
              <button
                type="button"
                className={`${styles.fermer} ${zoom === "grand" ? styles.visible : ""}`}
                aria-label="Fermer"
                onClick={(e) => {
                  e.stopPropagation();
                  revenir();
                }}
              >
                ×
              </button>
            </div>
          )}
        </div>

        <div className={styles.texte} key={actuel.id}>
          <p className={styles.numeroEtage}>{numero(choisi)}</p>
          <p className={styles.titreEtage}>
            <a
              href={`#etage-${actuel.id}`}
              onClick={(e) => {
                e.preventDefault();
                descendre();
              }}
            >
              {actuel.titre} <span aria-hidden="true">↓</span>
            </a>
          </p>
          {actuel.texte && <p className={styles.phrase}>{actuel.texte}</p>}
          <button type="button" className={styles.entrer} onClick={agrandir} disabled={!ouvert || zoom !== "non"}>
            Entrer
          </button>
        </div>
      </div>
    </section>
  );
}
