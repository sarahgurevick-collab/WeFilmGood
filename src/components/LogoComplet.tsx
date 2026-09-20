import { ROUGE_WFG } from "@/lib/engagements";
import styles from "./LogoComplet.module.css";

/**
 * Le logo complet de la marque — disque et « WE FILM GOOD » — dans sa
 * version fixe.
 *
 * Même principe que LogoAnime : le fichier original sert de pochoir, la
 * couleur est peinte à travers sa forme exacte. Rien n'est redessiné.
 *
 * Là où ce logo est posé, le nom ne doit pas être répété en texte à
 * côté : il fait partie du dessin.
 */
const RATIO = 1381 / 1113;

export default function LogoComplet({
  hauteur = 44,
  couleur = ROUGE_WFG,
}: {
  hauteur?: number;
  couleur?: string;
}) {
  return (
    <span
      className={styles.dessin}
      role="img"
      aria-label="WeFilmGood"
      style={{
        width: Math.round(hauteur * RATIO),
        height: hauteur,
        backgroundColor: couleur,
      }}
    />
  );
}
