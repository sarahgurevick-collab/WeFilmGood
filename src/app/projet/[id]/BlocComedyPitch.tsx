"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { envoyerEtoileFilante } from "./comedypitch-actions";
import styles from "./comedypitch.module.css";

export type ComedyPitchCadre = {
  /** La pastille verte : ce personnage attend son ComedyPitch. */
  attend: boolean;
  /** L'adresse du dépôt, si la personne connectée peut en déposer un. */
  deposer: string | null;
  videos: { id: string; prenom: string; vimeoId: string; etoiles: number; donnee: boolean; peutEtoiler: boolean }[];
};

/** L'étoile filante (dessin définitif du 12/11) : étoile pleine à cinq branches et trois traînées. */
export function EtoileFilante({ taille = 18 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 2 L18.23 5.3 L21.76 5.45 L19 7.65 L19.94 11.05 L17 9.1 L14.06 11.05 L15 7.65 L12.24 5.45 L15.77 5.3 Z" fill="currentColor" />
      <path d="M13 11.5 L4 20.5" />
      <path d="M11 8.5 L5 14.5" />
      <path d="M15.5 13.5 L10 19" />
    </svg>
  );
}

function Etoiles({ video }: { video: ComedyPitchCadre["videos"][number] }) {
  const [donnee, setDonnee] = useState(video.donnee);
  const [nombre, setNombre] = useState(video.etoiles);
  const [enCours, lancer] = useTransition();
  const compteur = nombre > 0 ? `${nombre} étoile${nombre > 1 ? "s" : ""} filante${nombre > 1 ? "s" : ""}` : null;

  return (
    <p className={styles.etoiles}>
      {video.peutEtoiler && !donnee && (
        <button
          type="button"
          className={styles.etoileBouton}
          disabled={enCours}
          onClick={() =>
            lancer(async () => {
              if (await envoyerEtoileFilante(video.id)) {
                setDonnee(true);
                setNombre((n) => n + 1);
              }
            })
          }
        >
          <EtoileFilante /> Envoyer une étoile filante
        </button>
      )}
      {compteur && (
        <span className={`${styles.compteur} ${donnee ? styles.donnee : ""}`}>
          <EtoileFilante taille={16} /> {compteur}
        </span>
      )}
    </p>
  );
}

/**
 * Sous la description d'un personnage (13/11/2026) : les ComedyPitchs en
 * ligne, chacun avec le prénom du comédien et ses étoiles filantes, puis
 * le bouton de dépôt pour qui peut en déposer un.
 */
export default function BlocComedyPitch({ comedypitch }: { comedypitch: ComedyPitchCadre }) {
  if (comedypitch.videos.length === 0 && !comedypitch.deposer) return null;
  return (
    <div className={styles.bloc}>
      {comedypitch.videos.map((v) => (
        <div key={v.id} className={styles.video}>
          <p className={styles.titre}>ComedyPitch de {v.prenom}</p>
          <div className={styles.ecran}>
            <iframe
              src={`https://player.vimeo.com/video/${v.vimeoId}`}
              loading="lazy"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={`ComedyPitch de ${v.prenom}`}
            />
          </div>
          <Etoiles video={v} />
        </div>
      ))}
      {comedypitch.deposer && (
        <Link href={comedypitch.deposer} className={styles.deposer}>
          Déposer mon ComedyPitch
        </Link>
      )}
    </div>
  );
}
