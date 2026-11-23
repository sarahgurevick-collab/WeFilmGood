"use client";

import Link from "next/link";
import { Etoiles } from "./BlocComedyPitch";
import styles from "./comedypitch.module.css";

export type MusicPitchFiche = {
  id: string;
  prenom: string;
  /** Lien d'écoute temporaire. */
  url: string;
  etoiles: number;
  donnee: boolean;
  peutEtoiler: boolean;
  /** Sur le profil du compositeur : le titre du projet, écrit au-dessus. */
  projet?: string;
};

/**
 * Les MusicPitchs en ligne d'un projet (23/11/2026, 0323) : chacun avec le
 * prénom du compositeur, son lecteur et ses étoiles, puis le bouton de
 * dépôt pour qui peut en déposer un. Sert aussi sur le profil du compositeur.
 */
export default function BlocMusicPitch({ sons, deposer }: { sons: MusicPitchFiche[]; deposer: string | null }) {
  if (sons.length === 0 && !deposer) return null;
  return (
    <div className={styles.bloc}>
      {sons.map((s) => (
        <div key={s.id}>
          <p className={styles.titre}>
            MusicPitch de {s.prenom}
            {s.projet ? ` · ${s.projet}` : ""}
          </p>
          {/* controlsList : pas de bouton de téléchargement dans le lecteur. */}
          <audio controls controlsList="nodownload" preload="none" src={s.url} className={styles.son} />
          <Etoiles video={s} />
        </div>
      ))}
      {deposer && (
        <Link href={deposer} className={styles.deposer}>
          Déposer mon MusicPitch
        </Link>
      )}
    </div>
  );
}
