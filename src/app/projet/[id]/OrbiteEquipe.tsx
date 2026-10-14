"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { MembreEquipe } from "./CadreEquipe";
import styles from "./orbite-equipe.module.css";

/**
 * L'équipe en orbite (14/10/2026, décision de Sarah) : à partir de trois
 * personnes, le porteur du projet au centre, en grand, et les autres
 * membres qui tournent lentement autour de lui sur un cercle en pointillés,
 * en portraits ronds, nom et métier dessous. Même construction que l'orbite
 * de la page Adhésion : scène dessinée sur 700 × 700, réduite en
 * pourcentages de sa largeur (cqw), ronds déplacés image par image.
 *
 * Un clic sur un portrait arrête l'orbite et ouvre sa biographie (à droite
 * sur grand écran, sous l'orbite sinon) ; un second la referme. L'orbite
 * attend aussi tant que la souris est dessus. L'enveloppe de contact reste
 * sous le porteur.
 */
const SCENE = 700;
const RAYON = 250;
const TAILLE_CENTRE = 180;
const TAILLE_SATELLITE = 84;
// Un tour complet, en secondes : lent, comme sur la page Adhésion.
const TOUR_S = 110;
const DEPART = -Math.PI / 2;
const CADENCE_BULLE_MS = 2600;

function deplacement(angle: number): string {
  const x = ((RAYON * Math.cos(angle)) / SCENE) * 100;
  const y = ((RAYON * Math.sin(angle)) / SCENE) * 100;
  return `translate(${x.toFixed(3)}cqw, ${y.toFixed(3)}cqw)`;
}

export default function OrbiteEquipe({
  equipe,
  porteur,
  ouvert,
  setOuvert,
  contact,
}: {
  equipe: MembreEquipe[];
  porteur?: string | null;
  ouvert: string | null;
  setOuvert: (cle: string | null) => void;
  /** L'enveloppe pour écrire au porteur. */
  contact?: ReactNode;
}) {
  const centre = equipe.find((m) => m.cle === porteur) ?? equipe[0];
  const satellites = equipe.filter((m) => m.cle !== centre.cle);
  const elements = useRef<(HTMLDivElement | null)[]>([]);
  const tour = useRef(0);
  const survol = useRef(false);
  const arret = useRef(false);
  const [vedette, setVedette] = useState(0);

  useEffect(() => {
    arret.current = ouvert !== null;
  }, [ouvert]);

  // Sur téléphone, les noms ne tiennent pas tous : chacun se présente à
  // tour de rôle, dans une bulle.
  useEffect(() => {
    if (ouvert || satellites.length === 0) return;
    const minuteur = setInterval(() => setVedette((v) => (v + 1) % satellites.length), CADENCE_BULLE_MS);
    return () => clearInterval(minuteur);
  }, [ouvert, satellites.length]);

  useEffect(() => {
    const immobile = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const vitesse = immobile ? 0 : (2 * Math.PI) / TOUR_S;
    let image = 0;
    let avant = performance.now();
    const n = satellites.length;
    const avancer = (maintenant: number) => {
      const dt = Math.min((maintenant - avant) / 1000, 0.1);
      avant = maintenant;
      if (!survol.current && !arret.current) tour.current += vitesse * dt;
      elements.current.forEach((element, i) => {
        if (element) element.style.transform = deplacement(DEPART + tour.current + (i * 2 * Math.PI) / n);
      });
      image = requestAnimationFrame(avancer);
    };
    image = requestAnimationFrame(avancer);
    return () => cancelAnimationFrame(image);
  }, [satellites.length]);

  const styleDepart = (i: number): CSSProperties => ({
    ["--taille" as string]: `${(TAILLE_SATELLITE / SCENE) * 100}%`,
    transform: deplacement(DEPART + (i * 2 * Math.PI) / satellites.length),
  });

  const portrait = (m: MembreEquipe) => (
    <span className={styles.portrait} aria-hidden="true">
      {m.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.photo} alt="" draggable={false} />
      ) : (
        <span>{m.nom.trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  );

  // Le rond lui-même : un bouton qui déplie la biographie, un lien vers le
  // profil, ou rien de cliquable (invitation en attente, sans adhésion).
  const rond = (m: MembreEquipe, classe: string) => {
    const ouvertIci = ouvert === m.cle;
    const classes = `${classe} ${ouvertIci ? styles.choisi : ""} ${m.enAttente ? styles.attente : ""}`;
    if (m.deplie) {
      return (
        <button
          type="button"
          className={classes}
          aria-expanded={ouvertIci}
          aria-label={ouvertIci ? `Refermer ${m.nom}` : `Lire la biographie de ${m.nom || "ce membre"}`}
          onClick={() => setOuvert(ouvertIci ? null : m.cle)}
        >
          {portrait(m)}
        </button>
      );
    }
    if (!m.enAttente && m.profileId) {
      return (
        <Link href={`/membres/${m.profileId}`} className={classes} aria-label={m.nom || "Voir le profil"}>
          {portrait(m)}
        </Link>
      );
    }
    return <div className={classes}>{portrait(m)}</div>;
  };

  const legende = (m: MembreEquipe) => (
    <>
      {m.nom && <span className={styles.nom}>{m.nom}</span>}
      {m.role && <strong className={styles.role}>{m.role}</strong>}
      {m.langues && <span className={styles.petit}>{m.langues}</span>}
      {m.lieu && (
        <span className={`${styles.petit} ${styles.lieu}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/drapeaux/${m.lieu.code}.svg`} alt="" />
          {m.lieu.texte}
        </span>
      )}
      {m.enAttente && <span className={styles.petit}>{m.enAttente}</span>}
    </>
  );

  const membreOuvert = equipe.find((m) => m.cle === ouvert);

  return (
    <div className={styles.orbite}>
      <div className={styles.cadreScene}>
        <div
          className={styles.scene}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") survol.current = true;
          }}
          onPointerLeave={() => {
            survol.current = false;
          }}
        >
          <svg className={styles.cercle} viewBox="0 0 700 700" aria-hidden="true">
            <circle cx="350" cy="350" r={RAYON} />
          </svg>

          {/* Le porteur, au centre. */}
          <div className={styles.centre} style={{ ["--taille" as string]: `${(TAILLE_CENTRE / SCENE) * 100}%` }}>
            {rond(centre, styles.rondCentre)}
            <div className={styles.legendeCentre}>{legende(centre)}</div>
            {contact && <div className={styles.contact}>{contact}</div>}
          </div>

          {satellites.map((m, i) => (
            <div
              key={m.cle}
              className={styles.place}
              style={styleDepart(i)}
              ref={(el) => {
                elements.current[i] = el;
              }}
            >
              {rond(m, styles.rond)}
              <div className={`${styles.legende} ${vedette === i || ouvert === m.cle ? styles.enVedette : ""}`}>
                {legende(m)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* La biographie sous l'orbite, là où le panneau de droite n'existe pas. */}
      {membreOuvert && (
        <div className={styles.bioDessous}>
          <p>{membreOuvert.bio || "Ce membre n'a pas encore rédigé sa biographie."}</p>
          {membreOuvert.site && (
            <p>
              <a href={membreOuvert.site} target="_blank" rel="noopener noreferrer">
                Son site
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
