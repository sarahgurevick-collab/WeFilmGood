"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./GalerieSucces.module.css";

/*
 * Galerie des success stories (04/11/2026, Sarah, d'après « Shared Element
 * Gallery » de 21st.dev) : un mur d'images en colonnes qui défile lentement
 * tout seul. Les films tournés sont montrés en affiche (portrait) quand on
 * l'a, les projets signés en 16/9. Survol ou doigt : les informations ;
 * clic : l'image s'agrandit au centre de l'écran.
 * Entrée (essai du 04/11, d'après « Animated Scroll Gallery » de 21st.dev) :
 * le mur arrive couché en perspective et se redresse à mesure qu'on descend.
 * Retour : étiquette accueil-avant-galerie-inclinee.
 */

export type FilmGalerie = {
  titre: string;
  auteur?: string | null;
  sousTitre?: string;
  image?: string | null;
  affiche?: string | null;
};

// Hauteur d'une image pour une colonne de largeur 1.
const HAUTEUR_AFFICHE = 1.5;
const HAUTEUR_169 = 9 / 16;
// Secondes pour faire défiler une hauteur de colonne de largeur 1 : plus c'est grand, plus c'est lent.
const SECONDES_PAR_UNITE = 7;

function useColonnes() {
  const [n, setN] = useState(4);
  useEffect(() => {
    const lire = () =>
      setN(
        window.innerWidth >= 1100
          ? 5
          : window.innerWidth >= 800
            ? 4
            : window.innerWidth >= 520
              ? 3
              : 2,
      );
    lire();
    window.addEventListener("resize", lire);
    return () => window.removeEventListener("resize", lire);
  }, []);
  return n;
}

const hauteurDe = (f: FilmGalerie) =>
  f.affiche ? HAUTEUR_AFFICHE : HAUTEUR_169;

export default function GalerieSucces({ films }: { films: FilmGalerie[] }) {
  const nbColonnes = useColonnes();
  // L'entrée : de 0 (le haut du mur entre par le bas de l'écran) à 1, il passe
  // de couché à droit. Plus lent (04/11, Sarah : « il se relève trop vite ») :
  // la scène est plus haute que le mur, qui reste en place à l'écran pendant
  // qu'il se redresse.
  const scene = useRef<HTMLDivElement>(null);
  const sansAnimation = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: scene,
        // 04/11 (Sarah : « quand l'image apparaît il est déjà debout ») : il
    // arrive tout couché et ne commence à se relever qu'une fois en place.
    offset: ["start 0.15", "end end"],
  });
  const inclinaison = useTransform(scrollYProgress, [0, 1], [sansAnimation ? 0 : 58, 0]);
  const taille = useTransform(scrollYProgress, [0, 1], [sansAnimation ? 1 : 0.82, 1]);
  const descente = useTransform(scrollYProgress, [0, 1], [sansAnimation ? 0 : -60, 0]);
  const [ouvert, setOuvert] = useState<{
    cle: string;
    film: FilmGalerie;
  } | null>(null);

  // Chaque film va dans la colonne la moins haute, pour un mur régulier.
  const colonnes = useMemo(() => {
    const cols: { films: FilmGalerie[]; hauteur: number }[] = Array.from(
      { length: nbColonnes },
      () => ({
        films: [],
        hauteur: 0,
      }),
    );
    for (const f of films) {
      const c = cols.reduce((a, b) => (b.hauteur < a.hauteur ? b : a));
      c.films.push(f);
      c.hauteur += hauteurDe(f) + 0.05;
    }
    return cols;
  }, [films, nbColonnes]);

  useEffect(() => {
    if (!ouvert) return;
    const touche = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(null);
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [ouvert]);

  return (
    <>
      <div ref={scene} className={sansAnimation ? undefined : styles.scene}>
      <div className={styles.epingle}>
      <motion.div
        className={`${styles.galerie} ${ouvert ? styles.enPause : ""}`}
        style={{ rotateX: inclinaison, scale: taille, y: descente }}
      >
        {colonnes.map((col, ci) => (
          <div key={ci} className={styles.colonne}>
            {/* La liste est écrite deux fois : quand la première moitié est passée,
                la colonne revient au départ sans que cela se voie. */}
            <div
              className={styles.defile}
              style={{
                animationDuration: `${Math.round(col.hauteur * SECONDES_PAR_UNITE)}s`,
                // Les colonnes ne partent pas toutes du même point.
                animationDelay: `-${Math.round(col.hauteur * SECONDES_PAR_UNITE * ((ci * 0.37) % 1))}s`,
              }}
            >
              {[0, 1].map((copie) =>
                col.films.map((f, i) => {
                  const cle = `${ci}-${i}-${copie}`;
                  return (
                    <Carte
                      key={cle}
                      cle={cle}
                      film={f}
                      cachee={copie === 1}
                      masquee={ouvert?.cle === cle}
                      onOuvrir={() => setOuvert({ cle, film: f })}
                    />
                  );
                }),
              )}
            </div>
          </div>
        ))}
      </motion.div>
      </div>
      </div>

      {/* Posée sur la page entière, au-dessus de la barre du haut. */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {ouvert && (
              <motion.div
                className={styles.fond}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOuvert(null)}
                role="dialog"
                aria-modal="true"
                aria-label={ouvert.film.titre}
              >
                <motion.div
                  layoutId={ouvert.cle}
                  className={`${styles.grande} ${ouvert.film.affiche ? styles.grandeAffiche : ""}`}
                  transition={{ type: "spring", damping: 30, stiffness: 260 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Visuel film={ouvert.film} />
                  <div className={styles.grandeInfos}>
                    <Infos film={ouvert.film} />
                  </div>
                </motion.div>
                <button
                  type="button"
                  className={styles.fermer}
                  aria-label="Fermer"
                  onClick={() => setOuvert(null)}
                >
                  ×
                </button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function Carte({
  cle,
  film,
  cachee,
  masquee,
  onOuvrir,
}: {
  cle: string;
  film: FilmGalerie;
  /** La seconde copie de la liste : invisible pour les lecteurs d'écran et le clavier. */
  cachee: boolean;
  masquee: boolean;
  onOuvrir: () => void;
}) {
  return (
    <motion.button
      type="button"
      layoutId={cle}
      className={`${styles.carte} ${film.affiche ? styles.carteAffiche : ""}`}
      style={{ visibility: masquee ? "hidden" : undefined }}
      onClick={onOuvrir}
      aria-hidden={cachee || undefined}
      tabIndex={cachee ? -1 : undefined}
      aria-label={cachee ? undefined : film.titre}
    >
      <Visuel film={film} />
      <span className={styles.infos}>
        <Infos film={film} />
      </span>
    </motion.button>
  );
}

function Visuel({ film }: { film: FilmGalerie }) {
  const src = film.affiche ?? film.image;
  if (!src) {
    return (
      <span className={styles.sansImage}>
        <span className={styles.trait} />
        <span className={styles.sansImageTitre}>{film.titre}</span>
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      draggable={false}
      className={styles.image}
    />
  );
}

function Infos({ film }: { film: FilmGalerie }) {
  return (
    <>
      <span className={styles.infosTitre}>{film.titre}</span>
      {film.auteur && <span className={styles.infosAuteur}>{film.auteur}</span>}
      {film.sousTitre && (
        <span className={styles.infosSous}>{film.sousTitre}</span>
      )}
    </>
  );
}
