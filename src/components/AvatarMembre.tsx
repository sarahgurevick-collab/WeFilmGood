import styles from "./AvatarMembre.module.css";

/**
 * Le rond d'un membre (20/10/2026, Sarah : plus chaleureux dans les
 * messages) : sa photo, ou, sans photo, la lettre de son métier sur fond
 * rouge. Un simple rond, jamais un lien : l'appelant l'enveloppe si besoin.
 */
export default function AvatarMembre({ src, lettre, nom, taille = 40 }: { src: string | null; lettre: string; nom?: string; taille?: number }) {
  return (
    <span
      className={`${styles.rond} ${src ? "" : styles.lettre}`}
      style={{ width: taille, height: taille, fontSize: Math.round(taille * 0.36) }}
      title={nom}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" loading="lazy" /> : lettre}
    </span>
  );
}
