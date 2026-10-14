"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { PersonnageCadre } from "./CadreEquipe";
import styles from "./eventail.module.css";

/**
 * Les personnages en éventail (14/10/2026, Sarah) : les mêmes cartes
 * verticales que dans la Galaxie de personnages, rangées sur un cercle —
 * la logique circulaire du site et du logo —, la carte active au centre,
 * un peu plus grande, les autres en retrait de chaque côté. Modèle :
 * « Card Stack » de Ruixen (21st.dev), réécrit sans Tailwind.
 *
 * On change de carte en tirant l'éventail vers la gauche ou la droite, en
 * cliquant sur une carte de côté, avec les flèches du clavier ou par les
 * points en dessous. Un clic sur la carte du centre ouvre sa description
 * (à droite sur grand écran, sous l'éventail sinon), un second la referme.
 * L'éventail est un cercle (14/10, Sarah) : les cartes se répartissent à
 * gauche et à droite de celle du centre — à trois, une au milieu, une de
 * chaque côté — et on bascule dans le sens qu'on veut, sans bout.
 * Il se déplace tout seul, lentement et sans à-coup : une carte toutes les
 * six secondes, en glissant, toujours dans le même sens. Il s'arrête quand la
 * souris est dessus, qu'une description est ouverte ou qu'il n'est pas à
 * l'écran. Un seul clic sur une carte : elle vient au centre ET sa
 * description s'ouvre ; un clic sur la carte du centre la referme.
 *
 * À moins de trois personnages, pas d'éventail : les mêmes cartes côte à
 * côte, l'une sous l'autre sur téléphone.
 */
const PAS_DEG = 11;
const VISIBLES = 3;
const SEUIL_GLISSEMENT = 40;
const CADENCE_MS = 6000;

export default function EventailPersonnages({
  personnages,
  ouvert,
  setOuvert,
}: {
  personnages: PersonnageCadre[];
  ouvert: string | null;
  setOuvert: (id: string | null) => void;
}) {
  const [actif, setActif] = useState(() => {
    const i = ouvert ? personnages.findIndex((p) => p.id === ouvert) : -1;
    return i >= 0 ? i : 0;
  });
  const depart = useRef<number | null>(null);
  const aGlisse = useRef(false);
  const scene = useRef<HTMLDivElement | null>(null);
  const [survole, setSurvole] = useState(false);
  const [aLEcran, setALEcran] = useState(true);
  // Le dernier déplacement vient-il de l'éventail lui-même (lent, linéaire)
  // ou de la personne (vif) ?
  const [glisseLent, setGlisseLent] = useState(false);
  const n = personnages.length;
  // La place d'une carte par rapport au centre, sur le cercle : de -n/2 à +n/2.
  const placeDepuis = (i: number, centre: number) => {
    let d = (((i - centre) % n) + n) % n;
    if (d > n / 2) d -= n;
    return d;
  };
  const place = (i: number) => placeDepuis(i, actif);
  // Le centre du rendu précédent (état dérivé) : une carte qui passe d'un
  // bord à l'autre quand le cercle se referme saute sans transition, au
  // lieu de traverser l'éventail.
  const [actifPrecedent, setActifPrecedent] = useState(actif);
  const [actifAvant, setActifAvant] = useState(actif);
  if (actif !== actifPrecedent) {
    setActifAvant(actifPrecedent);
    setActifPrecedent(actif);
  }

  // Une description ouverte ailleurs (arrivée depuis la Galaxie) amène sa
  // carte au centre : état dérivé, calculé pendant le rendu.
  const [dernierOuvert, setDernierOuvert] = useState(ouvert);
  if (ouvert !== dernierOuvert) {
    setDernierOuvert(ouvert);
    const i = ouvert ? personnages.findIndex((p) => p.id === ouvert) : -1;
    if (i >= 0) setActif(i);
  }

  // À l'écran ou pas : hors écran, l'éventail n'avance pas.
  useEffect(() => {
    const el = scene.current;
    if (!el) return;
    const io = new IntersectionObserver(([entree]) => setALEcran(entree.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // La dérive lente : une carte toutes les six secondes, en glissant (la
  // transition dure autant que l'intervalle, le mouvement est continu),
  // dans un sens puis dans l'autre arrivé au bout.
  const enEventail = personnages.length >= 3;
  useEffect(() => {
    if (!enEventail || survole || ouvert || !aLEcran) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduit) return;
    const id = setInterval(() => {
      if (depart.current !== null) return;
      setGlisseLent(true);
      setActif((a) => (a + 1) % personnages.length);
    }, CADENCE_MS);
    return () => clearInterval(id);
  }, [enEventail, survole, ouvert, aLEcran, personnages.length]);

  const aller = (i: number) => {
    // Sur le cercle : après le dernier vient le premier, et inversement.
    const borne = ((i % n) + n) % n;
    setGlisseLent(false);
    setActif(borne);
    // La description suit la carte du centre si elle était ouverte.
    if (ouvert && personnages[borne] && ouvert !== personnages[borne].id) setOuvert(null);
  };

  const surPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    depart.current = e.clientX;
    aGlisse.current = false;
  };
  const surPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (depart.current === null) return;
    if (Math.abs(e.clientX - depart.current) > SEUIL_GLISSEMENT) aGlisse.current = true;
  };
  const surPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (depart.current === null) return;
    const dx = e.clientX - depart.current;
    depart.current = null;
    if (dx < -SEUIL_GLISSEMENT) aller(actif + 1);
    else if (dx > SEUIL_GLISSEMENT) aller(actif - 1);
  };
  const surClavier = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      aller(actif + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      aller(actif - 1);
    }
  };

  const courant = personnages[actif];

  const contenuCarte = (c: PersonnageCadre) => (
    <>
      <span className={styles.portrait} aria-hidden="true">
        {c.portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.portrait} alt="" draggable={false} style={{ objectPosition: c.cadrage }} />
        ) : (
          <span>{c.nom.trim().charAt(0).toUpperCase()}</span>
        )}
      </span>
      <strong className={styles.nom}>{c.nom}</strong>
      {c.infos && <span className={styles.infos}>{c.infos}</span>}
    </>
  );

  // Moins de trois : les mêmes cartes, côte à côte (l'une sous l'autre sur
  // téléphone), un clic ouvre la description.
  if (!enEventail) {
    const ouverte = personnages.find((c) => c.id === ouvert);
    return (
      <div className={styles.zone}>
        <div className={styles.rangee}>
          {personnages.map((c) => (
            <button
              key={c.id}
              id={`personnage-${c.id}`}
              type="button"
              className={`${styles.carte} ${styles.carteRangee} ${ouvert === c.id ? styles.ouverte : ""}`}
              aria-pressed={ouvert === c.id}
              aria-label={ouvert === c.id ? `Refermer ${c.nom}` : `Lire la description de ${c.nom}`}
              onClick={() => setOuvert(ouvert === c.id ? null : c.id)}
            >
              {contenuCarte(c)}
            </button>
          ))}
        </div>
        {ouverte?.bio && <p className={styles.bioDessous}>{ouverte.bio}</p>}
      </div>
    );
  }

  return (
    <div className={styles.zone}>
      <div
        ref={scene}
        className={`${styles.scene} ${glisseLent ? styles.derive : ""}`}
        onPointerEnter={() => setSurvole(true)}
        onPointerLeave={() => {
          setSurvole(false);
          depart.current = null;
        }}
        role="group"
        aria-roledescription="éventail"
        aria-label="Les personnages"
        tabIndex={0}
        onKeyDown={surClavier}
        onPointerDown={surPointerDown}
        onPointerMove={surPointerMove}
        onPointerUp={surPointerUp}
        onPointerCancel={() => {
          depart.current = null;
        }}
      >
        {personnages.map((c, i) => {
          const decalage = place(i);
          if (Math.abs(decalage) > VISIBLES) return null;
          const saute = Math.abs(decalage - placeDepuis(i, actifAvant)) > VISIBLES;
          const estActif = decalage === 0;
          const estOuvert = ouvert === c.id;
          return (
            <button
              key={c.id}
              id={`personnage-${c.id}`}
              type="button"
              className={`${styles.carte} ${estActif ? styles.active : ""} ${estOuvert ? styles.ouverte : ""} ${saute ? styles.saut : ""}`}
              style={{
                transform: `translateX(-50%) rotate(${decalage * PAS_DEG}deg) translateY(${estActif ? -16 : 0}px) scale(${estActif ? 1.04 : 0.94})`,
                opacity: 1 - Math.abs(decalage) * 0.18,
                zIndex: 20 - Math.abs(decalage),
              }}
              aria-pressed={estActif ? estOuvert : undefined}
              aria-label={estActif && estOuvert ? `Refermer ${c.nom}` : `Lire la description de ${c.nom}`}
              onClick={() => {
                if (aGlisse.current) return;
                // Un seul clic : la carte vient au centre et sa description
                // s'ouvre (14/10, Sarah). Sur la carte du centre : ouvre ou referme.
                if (estActif) setOuvert(estOuvert ? null : c.id);
                else {
                  setGlisseLent(false);
                  setActif(i);
                  setOuvert(c.id);
                }
              }}
            >
              {contenuCarte(c)}
            </button>
          );
        })}
      </div>

      <div className={styles.points} role="tablist" aria-label="Choisir un personnage">
        {personnages.map((c, i) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={i === actif}
            aria-label={c.nom}
            className={`${styles.point} ${i === actif ? styles.pointActif : ""}`}
            onClick={() => aller(i)}
          />
        ))}
      </div>

      {/* Sous l'éventail, sur les écrans où le panneau de droite n'existe pas. */}
      {courant && ouvert === courant.id && courant.bio && (
        <p className={styles.bioDessous}>{courant.bio}</p>
      )}
    </div>
  );
}
