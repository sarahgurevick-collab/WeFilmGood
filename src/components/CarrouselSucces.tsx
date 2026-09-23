"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styles from "./CarrouselSucces.module.css";

/*
 * Carrousel « squeeze » des success stories : un panneau ouvert, les
 * suivants serrés en lamelles sur la droite. Ouvrir une lamelle l'élargit
 * et fait glisser la rangée ; le texte dessous se fond d'un panneau à
 * l'autre. Adapté du composant SqueezeCarousel (21st.dev), réécrit sans
 * Tailwind pour les feuilles de style du site.
 */

export type DiapoSucces = {
  id: string;
  /** Début de phrase, en clair sous les panneaux. */
  titre: string;
  /** Suite de la phrase, en gris. */
  phrase?: string;
  /** Image du panneau, recadrée au centre quand il se resserre. */
  image?: string;
  imageAlt?: string;
  /** Fond CSS quand il n'y a pas d'image : dégradé, couleur. */
  fond?: string;
  /** Petit texte dans le coin du panneau ouvert. */
  marque?: string;
  /** Texte du bouton. Sans texte, pas de bouton. */
  bouton?: string;
  href?: string;
};

/*
 * La rangée compte quatre colonnes puis une queue de lamelles. Les quatre
 * colonnes se partagent la place restante ; le panneau ouvert part d'un
 * bloc 16:9 et en rend un peu (d'où la part négative). La colonne −1 et
 * tout ce qui dépasse la colonne 3 sont des lamelles.
 */
const PARTS = [-0.06, 0.61, 0.3, 0.15];
/** La colonne survolée prend plus de place… */
const ETIREE = [0, 0.71, 0.4, 0.25];
/** …et ses voisines en cèdent un peu. */
const SERREE = [-0.12, 0.59, 0.28, 0.13];

const DUREE_MS = 1000;
/** Délai avant de passer seul au panneau suivant. */
const INTERVALLE_MS = 6000;

type Carte = { key: number; diapo: number };

function useMoinsDeMouvement(): boolean {
  const [reduit, setReduit] = useState(false);
  useEffect(() => {
    const requete = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lire = () => setReduit(requete.matches);
    lire();
    requete.addEventListener("change", lire);
    return () => requete.removeEventListener("change", lire);
  }, []);
  return reduit;
}

export default function CarrouselSucces({ diapos }: { diapos: DiapoSucces[] }) {
  const nb = diapos.length;
  const boucle = (i: number) => ((i % nb) + nb) % nb;

  const lamelles = Math.max(1, Math.min(3, nb - 4));
  const visibles = 4 + lamelles;

  const reduit = useMoinsDeMouvement();
  const ms = reduit ? 0 : DUREE_MS;

  const ids = useId();
  const router = useRouter();
  // Les premières clés sont les places 0…visibles-1 ; les suivantes
  // continuent la numérotation.
  const graine = useRef(visibles);

  const [cartes, setCartes] = useState<Carte[]>(() =>
    Array.from({ length: visibles }, (_, p) => ({ key: p, diapo: boucle(p) })),
  );
  // Colonne de chaque carte = sa place dans la bande + `colonne`.
  const [colonne, setColonne] = useState(0);
  const colonneRef = useRef(0);
  const enAvant = useRef(true);
  // Décalage de la bande, en lamelles.
  const [glisse, setGlisse] = useState(0);
  const [immobile, setImmobile] = useState(false);
  const [survol, setSurvol] = useState(-1);

  const ouvert = cartes[-colonne]?.diapo ?? 0;
  const minuteurs = useRef<number[]>([]);

  useEffect(() => () => minuteurs.current.forEach(clearTimeout), []);

  // Une fois le mouvement fini, on ramène la bande aux seules cartes
  // visibles et les compteurs à zéro — même image, donc sans animation.
  const ranger = useCallback(() => {
    setCartes((bande) => (enAvant.current ? bande.slice(-visibles) : bande.slice(0, visibles)));
    colonneRef.current = 0;
    setColonne(0);
    setGlisse(0);
    setImmobile(true);
  }, [visibles]);

  useLayoutEffect(() => {
    if (!immobile) return;
    const id = requestAnimationFrame(() => setImmobile(false));
    return () => cancelAnimationFrame(id);
  }, [immobile]);

  const avancer = useCallback(
    (de: number) => {
      if (nb < 2 || de === 0) return;
      minuteurs.current.forEach(clearTimeout);
      minuteurs.current = [];
      enAvant.current = de > 0;

      if (de > 0) {
        setCartes((bande) => [
          ...bande,
          ...Array.from({ length: de }, (_, k) => ({
            key: graine.current++,
            diapo: boucle(bande[bande.length - 1].diapo + 1 + k),
          })),
        ]);
        colonneRef.current -= de;
        setColonne(colonneRef.current);
        setGlisse((g) => g - de);
      } else {
        // En arrière, la bande grandit par le début : on la décale d'autant
        // sans transition, puis on la laisse revenir en douceur.
        setCartes((bande) => [
          ...Array.from({ length: -de }, (_, k) => ({
            key: graine.current++,
            diapo: boucle(bande[0].diapo - (-de - k)),
          })),
          ...bande,
        ]);
        setGlisse((g) => g + de);
        setImmobile(true);
        minuteurs.current.push(window.setTimeout(() => setGlisse(0), 0));
      }

      minuteurs.current.push(window.setTimeout(ranger, ms + 20));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nb, ms, ranger],
  );

  /* --- défilement automatique, suspendu au survol ---------------------- */

  const [pause, setPause] = useState(false);
  useEffect(() => {
    if (pause || reduit || nb < 2) return;
    const minuteur = window.setTimeout(() => avancer(1), INTERVALLE_MS);
    return () => clearTimeout(minuteur);
  }, [pause, reduit, nb, ouvert, avancer]);

  const auClavier = (e: KeyboardEvent<HTMLDivElement>) => {
    const pas = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!pas) return;
    e.preventDefault();
    avancer(pas);
  };

  if (!nb) return null;

  const survolActif = survol >= 0 && survol <= 3 && !reduit;
  const partDe = (col: number) =>
    !survolActif ? PARTS[col] : survol === col ? ETIREE[col] : SERREE[col];

  const largeurDe = (col: number) => {
    if (col < 0 || col > 3) return "var(--sq-lamelle)";
    if (col === 0) return `calc(var(--sq-hero) + var(--sq-place) * ${partDe(0)})`;
    return `calc(var(--sq-place) * ${partDe(col)})`;
  };

  const vars = {
    "--sq-ms": `${ms}ms`,
    "--sq-nb-lamelles": lamelles,
  } as CSSProperties;

  return (
    <div className={styles.racine}>
      <div
        className={styles.carrousel}
        style={vars}
        onMouseEnter={() => setPause(true)}
        onMouseLeave={() => {
          setPause(false);
          setSurvol(-1);
        }}
        onFocusCapture={() => setPause(true)}
        onBlurCapture={() => setPause(false)}
      >
        {nb > 1 && (
          <div className={styles.fleches}>
            <Fleche arriere label="Précédent" onClick={() => avancer(-1)} />
            <Fleche label="Suivant" onClick={() => avancer(1)} />
          </div>
        )}

        <div className={styles.fenetre}>
          <div
            role="tablist"
            aria-label="Success stories"
            aria-orientation="horizontal"
            onKeyDown={auClavier}
            className={styles.bande}
            style={{
              transform: `translateX(calc(${glisse} * (var(--sq-lamelle) + var(--sq-gap))))`,
              transition: immobile ? "none" : "transform var(--sq-ms) var(--ease)",
            }}
          >
            {cartes.map((carte, place) => {
              const col = place + colonne;
              const diapo = diapos[carte.diapo];
              const devant = col === 0;
              const largeur = largeurDe(col);

              return (
                <button
                  key={carte.key}
                  type="button"
                  role="tab"
                  aria-selected={devant}
                  aria-controls={`${ids}-panneau`}
                  aria-label={diapo.titre}
                  tabIndex={devant ? 0 : -1}
                  onMouseMove={() => setSurvol(col)}
                  onClick={() => {
                    // Le panneau ouvert mène à sa fiche ; une lamelle s'ouvre.
                    if (col > 0) avancer(col);
                    else if (devant && diapo.href) router.push(diapo.href);
                  }}
                  className={styles.carte}
                  style={{
                    width: largeur,
                    marginLeft:
                      place === 0 ? 0 : col < 4 ? "var(--sq-gap)" : "var(--sq-lamelle-gap)",
                    borderRadius: `min(var(--sq-rayon), calc(${largeur} / 2))`,
                    transitionDuration: immobile ? "0s" : "var(--sq-ms)",
                  }}
                >
                  <ImageDiapo diapo={diapo} />
                  {diapo.marque && (
                    <span
                      aria-hidden="true"
                      className={styles.marque}
                      style={{ opacity: devant ? 1 : 0 }}
                    >
                      {diapo.marque}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div id={`${ids}-panneau`} role="tabpanel" aria-live="polite" className={styles.textes}>
          {diapos.map((diapo, i) => {
            const visible = i === ouvert;
            return (
              <div
                key={diapo.id}
                aria-hidden={!visible}
                className={styles.texte}
                style={{
                  opacity: visible ? 1 : 0,
                  visibility: visible ? "visible" : "hidden",
                  pointerEvents: visible ? "auto" : "none",
                }}
              >
                <p className={styles.phrase}>
                  <span className={styles.titre}>{diapo.titre}</span>{" "}
                  {diapo.phrase && <span className={styles.suite}>{diapo.phrase}</span>}
                </p>
                {diapo.bouton && diapo.href && (
                  <Link href={diapo.href} tabIndex={visible ? 0 : -1} className={styles.action}>
                    {diapo.bouton}
                    <svg width="6" height="9" viewBox="0 0 6 9" fill="none" aria-hidden="true">
                      <path
                        d="M1.2 1 4.7 4.5 1.2 8"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/*
 * L'image est dessinée à la taille fixe du bloc 16:9 et centrée, jamais
 * à la largeur de sa carte : elle garde une seule échelle, la carte ne
 * fait que changer la part qu'on en voit.
 */
function ImageDiapo({ diapo }: { diapo: DiapoSucces }) {
  if (diapo.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={diapo.image} alt={diapo.imageAlt ?? ""} draggable={false} className={styles.image} />
    );
  }
  return <span aria-hidden="true" className={styles.image} style={{ background: diapo.fond }} />;
}

function Fleche({
  arriere = false,
  label,
  onClick,
}: {
  arriere?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={styles.fleche}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path
          d={
            arriere
              ? "M9.6 2.6 5.1 7.1h9.1v1.8H5.1l4.5 4.5-1.2 1.2-6-6L1.8 8l.6-.6 6-6 1.2 1.2Z"
              : "M6.4 2.6l4.5 4.5H1.8v1.8h9.1l-4.5 4.5 1.2 1.2 6-6 .6-.6-.6-.6-6-6-1.2 1.2Z"
          }
        />
      </svg>
    </button>
  );
}
