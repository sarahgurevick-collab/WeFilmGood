"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import EtoileSpark from "@/components/EtoileSpark";
import { envoyerEtoileFilante } from "./comedypitch-actions";
import styles from "./comedypitch.module.css";

export type ComedyPitchCadre = {
  /** La pastille verte : ce personnage attend son ComedyPitch. */
  attend: boolean;
  /** L'adresse du dépôt, si la personne connectée peut en déposer un. */
  deposer: string | null;
  videos: { id: string; prenom: string; vimeoId: string; etoiles: number; donnee: boolean; peutEtoiler: boolean }[];
};

/**
 * L'étoile (13/11, Sarah : « ce ne sont plus des étoiles filantes mais une
 * étoile ») : l'étoile rouge à huit rayons, le nombre reçu au centre —
 * la même que sur /admin/essai-etoile. Elle remplace l'étoile filante du
 * 12/11. Une seule par personne : après l'envoi, il ne reste que l'étoile
 * et son nombre.
 */
function Etoiles({ video }: { video: ComedyPitchCadre["videos"][number] }) {
  const [donnee, setDonnee] = useState(video.donnee);
  const [nombre, setNombre] = useState(video.etoiles);
  const [enCours, lancer] = useTransition();
  const etoile = <EtoileSpark nombre={nombre} taille={46} vague={nombre - video.etoiles} />;

  if (!video.peutEtoiler || donnee) return <p className={styles.etoiles}>{etoile}</p>;
  return (
    <p className={styles.etoiles}>
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
        {etoile} Envoyer une étoile
      </button>
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
