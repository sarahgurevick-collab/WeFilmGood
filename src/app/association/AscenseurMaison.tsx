"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PHILOSOPHIE } from "@/data/association";
import styles from "./AscenseurMaison.module.css";

import type { EtageAssociation as EtageMaison } from "@/data/association";

// Les durées, en millisecondes.
const PORTES = 750; // l'ouverture ou la fermeture des portes
const PAS_ETAGE = 340; // le temps de passer d'un étage au suivant
const DELAI_DEPART = 1200; // avant que les portes s'ouvrent, à l'arrivée sur la page
const ZOOM = 650; // la photo qui grandit jusqu'au bord du boîtier, ou qui revient
const ATTENTE_ZOOM = 3000; // portes ouvertes, la photo grandit toute seule au bout de 3 s (Sarah, 16/10)
const DUREE_ZOOM = 3000; // et revient toute seule 3 s plus tard
const ARRET = 1500; // pendant la visite, la pause avant l'étage suivant
const VOL = 800; // une affiche qui vole des portes au cadre de droite
const ECART_VOL = 90; // et la suivante qui part juste après
const DUREE_MUR = 5000; // au rez-de-chaussée, les affiches restent rangées 5 s pendant la visite

// Les affiches derrière les portes, un peu de travers, comme collées au mur.
const PENCHE = [-7, 5, -3, 6, -5, 4, -2, 7, -6, 3];

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
 * la photo de l'étage. À l'arrivée sur
 * la page, la cabine fait la visite toute seule, jusqu'au premier geste.
 *
 * 16/10, retour de Sarah : l'ascenseur est posé sur un lagon aux palmiers,
 * sans cadre gris autour, plus petit, avec à côté la zone de texte de
 * l'étage (le titre de la section et une phrase de la page ; pour la
 * Philosophie, tout le texte de la section, 16/10).
 *
 * Comme dans l'original : l'ascenseur tient dans un petit boîtier (cadran,
 * portes, plaque d'appel) ; « Entrer », écrit sur la photo comme le
 * « Step inside » de l'original (ou à côté, ou un clic sur la photo), la
 * fait grandir jusqu'à remplir tout le boîtier, l'ascenseur s'assombrit
 * derrière ; un clic n'importe où, la croix × ou Échap ramène à
 * l'ascenseur. Le titre de la zone de texte descend à la section.
 *
 * Zoom automatique (Sarah, 16/10) : à chaque étage, 3 s après l'ouverture
 * des portes, la photo grandit toute seule ; 3 s plus tard elle revient,
 * et la visite passe à l'étage suivant. Une fois par arrivée. Le zoom
 * lancé par un clic, lui, reste jusqu'au clic suivant.
 *
 * Le rez-de-chaussée (Sarah, 17/10) : derrière les portes, les affiches
 * de la Maison au lieu d'une photo, sans texte par-dessus ; « Entrer » les
 * fait voler une à une jusqu'au cadre de droite, où elles se rangent par
 * deux rangées à la place du texte. Pendant la visite, elles y restent 5 s.
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
  const [arrivee, setArrivee] = useState(0); // compte les ouvertures de portes
  const zoomAuto = useRef(false); // le zoom en cours a été lancé tout seul
  const zoomFait = useRef(-1); // l'arrivée dont le zoom automatique a déjà eu lieu
  const [reduit, setReduit] = useState(false);
  const affichesPorte = useRef<(HTMLImageElement | null)[]>([]);
  const affichesMur = useRef<(HTMLImageElement | null)[]>([]);
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
      const prechargement = Promise.all((etages[k].affiches?.map((a) => a.image) ?? [etages[k].image]).map(charger));
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
      setArrivee((a) => a + 1);
    },
    [etages],
  );

  // À l'arrivée : les portes s'ouvrent sur le rez-de-chaussée.
  useEffect(() => {
    const t = window.setTimeout(() => aller(0), DELAI_DEPART);
    return () => window.clearTimeout(t);
  }, [aller]);

  // La visite : un étage après l'autre, jusqu'en haut, tant que personne
  // ne touche au tableau ; on repart une fois le zoom de l'étage revenu.
  useEffect(() => {
    // Arrivée en haut : la visite s'arrête là, portes ouvertes.
    if (!visite || !ouvert || reduit || zoom !== "non" || choisi >= etages.length - 1) return;
    if (zoomFait.current !== arrivee) return;
    const t = window.setTimeout(() => aller(choisi + 1), ARRET);
    return () => window.clearTimeout(t);
  }, [visite, ouvert, reduit, zoom, arrivee, choisi, etages.length, aller]);

  const choisir = (k: number) => {
    setVisite(false);
    aller(k);
  };

  // La place des portes dans le boîtier : c'est de là que la photo part et là qu'elle revient.
  const mesurer = () => {
    const b = boitier.current?.getBoundingClientRect();
    const o = baie.current?.getBoundingClientRect();
    if (!b || !o) return;
    setPlace({ top: o.top - b.top, left: o.left - b.left, right: b.right - o.right, bottom: b.bottom - o.bottom });
  };

  /** `seul` : lancé par le minuteur, pas par un clic (la visite continue alors). */
  const agrandir = (seul = false) => {
    if (!ouvert) return;
    // Au rez-de-chaussée, un second clic sur les portes rappelle les affiches.
    if (zoom !== "non") {
      if (zoom === "grand") revenir();
      return;
    }
    if (!seul) setVisite(false);
    zoomAuto.current = seul;
    mesurer();
    if (reduit) {
      setZoom("grand");
      return;
    }
    setZoom("depart");
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setZoom("grand")));
  };

  const revenir = (seul = false) => {
    if (!seul) setVisite(false);
    zoomAuto.current = false;
    if (reduit) {
      setZoom("non");
      return;
    }
    mesurer();
    setZoom("retour");
    window.setTimeout(() => setZoom((z) => (z === "retour" ? "non" : z)), ZOOM);
  };

  // Les minuteurs appellent toujours la dernière version de ces deux gestes.
  const gestes = useRef({ agrandir, revenir });
  useEffect(() => {
    gestes.current = { agrandir, revenir };
  });

  // 3 s après l'ouverture des portes, la photo grandit toute seule (une fois par arrivée).
  useEffect(() => {
    if (!ouvert || zoom !== "non" || reduit || zoomFait.current === arrivee) return;
    const t = window.setTimeout(() => {
      zoomFait.current = arrivee;
      gestes.current.agrandir(true);
    }, ATTENTE_ZOOM);
    return () => window.clearTimeout(t);
  }, [ouvert, zoom, reduit, arrivee]);

  // Le zoom automatique revient tout seul 3 s plus tard (les affiches, 5 s).
  const avecAffiches = !!etages[choisi].affiches;
  useEffect(() => {
    if (zoom !== "grand" || !zoomAuto.current) return;
    const t = window.setTimeout(() => gestes.current.revenir(true), avecAffiches ? DUREE_MUR : DUREE_ZOOM);
    return () => window.clearTimeout(t);
  }, [zoom, avecAffiches]);

  // Le vol des affiches : chacune part de sa place derrière les portes et
  // vient se ranger dans le cadre de droite, l'une après l'autre ; au retour,
  // toutes repartent ensemble vers les portes.
  const murVisible = avecAffiches && zoom !== "non";
  const depuisLaPorte = (i: number) => {
    const porte = affichesPorte.current[i];
    const mur = affichesMur.current[i];
    if (!porte || !mur) return null;
    const a = porte.getBoundingClientRect();
    const b = mur.getBoundingClientRect();
    const dx = a.left + a.width / 2 - (b.left + b.width / 2);
    const dy = a.top + a.height / 2 - (b.top + b.height / 2);
    const echelle = porte.offsetWidth / Math.max(1, mur.offsetWidth);
    return `translate(${dx}px, ${dy}px) rotate(${PENCHE[i % PENCHE.length]}deg) scale(${echelle})`;
  };
  useLayoutEffect(() => {
    if (!murVisible || reduit || zoom !== "depart") return;
    affichesMur.current.forEach((mur, i) => {
      const depart = depuisLaPorte(i);
      if (!mur || !depart) return;
      mur.animate([{ transform: depart }, { transform: "none" }], {
        duration: VOL,
        delay: i * ECART_VOL,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        fill: "backwards",
      });
    });
  }, [murVisible, reduit, zoom]);
  useLayoutEffect(() => {
    if (!murVisible || reduit || zoom !== "retour") return;
    affichesMur.current.forEach((mur, i) => {
      const arrivee = depuisLaPorte(i);
      if (!mur || !arrivee) return;
      mur.getAnimations().forEach((a) => a.cancel());
      mur.animate([{ transform: "none" }, { transform: arrivee }], {
        duration: ZOOM - 50,
        easing: "cubic-bezier(0.65, 0, 0.35, 1)",
        fill: "forwards",
      });
    });
  }, [murVisible, reduit, zoom]);

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
        <div
          className={`${styles.ascenseur} ${!avecAffiches && (zoom === "depart" || zoom === "grand") ? styles.assombri : ""}`}
          ref={boitier}
        >
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
                onClick={() => agrandir()}
                disabled={!ouvert}
                aria-label={`Entrer : ${actuel.nom}`}
              >
                {actuel.affiches ? (
                  // Le rez-de-chaussée (17/10) : les affiches de la Maison, sans texte par-dessus.
                  <span
                    key={actuel.id}
                    className={styles.affichesPorte}
                    style={{ "--colonnes": Math.ceil(actuel.affiches.length / 2) } as React.CSSProperties}
                  >
                    {actuel.affiches.map((a, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={a.image}
                        ref={(el) => {
                          affichesPorte.current[i] = el;
                        }}
                        src={a.image}
                        alt=""
                        className={`${styles.affichePorte} ${murVisible ? styles.envolee : ""}`}
                        style={{ "--i": i, "--penche": `${PENCHE[i % PENCHE.length]}deg` } as React.CSSProperties}
                      />
                    ))}
                    <span className={styles.entrerSeul} aria-hidden="true">
                      Entrer ↗
                    </span>
                  </span>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img key={actuel.id} src={actuel.image} alt={actuel.alt} className={styles.photo} />
                    <span className={styles.legende} aria-hidden="true">
                      <span className={styles.legendeNumero}>{numero(choisi)}</span>
                      <span className={styles.legendeNom}>{actuel.nom}</span>
                      <span className={styles.legendeEntrer}>Entrer ↗</span>
                    </span>
                  </>
                )}
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

          {zoom !== "non" && !avecAffiches && (
            <div
              className={`${styles.grand} ${zoom === "grand" ? styles.plein : ""}`}
              style={zoom === "grand" ? { top: 0, left: 0, right: 0, bottom: 0 } : place}
              onClick={() => revenir()}
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
          <p className={styles.titreEtage}>{actuel.titre}</p>
          {actuel.affiches && murVisible && (
            <button
              type="button"
              className={`${styles.fermer} ${styles.fermerMur} ${zoom === "grand" ? styles.visible : ""}`}
              aria-label="Fermer"
              onClick={() => revenir()}
            >
              ×
            </button>
          )}
          <div className={styles.contenu}>
            {actuel.affiches && murVisible && (
              <ul
                className={styles.mur}
                style={{ "--colonnes": Math.ceil(actuel.affiches.length / 2) } as React.CSSProperties}
                onClick={() => revenir()}
              >
                {actuel.affiches.map((a, i) => (
                  <li key={a.image}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={(el) => {
                        affichesMur.current[i] = el;
                      }}
                      src={a.image}
                      alt={`Affiche ${a.annee}, ${a.auteur}`}
                      title={`Affiche ${a.annee} — ${a.auteur}`}
                    />
                  </li>
                ))}
              </ul>
            )}
            {actuel.id === "philosophie" ? (
              <div className={`${styles.philosophie} ${murVisible ? styles.cache : ""}`}>
                {PHILOSOPHIE.map((p) => (
                  <p key={p} className={styles.phrase}>
                    {p}
                  </p>
                ))}
                <p className={styles.phrase}>
                  Retrouvez-nous « online » sur la plateforme{" "}
                  <Link href="/" className={styles.marque}>
                    <span className={styles.rouge}>We</span>Film<span className={styles.rouge}>Good</span>
                  </Link>
                  , pour que les scénaristes les moins connectés et les plus isolés puissent bénéficier de notre
                  accompagnement.
                </p>
                <p className={`${styles.phrase} ${styles.devise}`}>Travaillons ensemble pour voir nos scripts sur les écrans !</p>
              </div>
            ) : (
              actuel.texte && <p className={styles.phrase}>{actuel.texte}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
