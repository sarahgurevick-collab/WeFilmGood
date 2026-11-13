import { ROUGE_WFG } from "@/lib/engagements";
import styles from "./anneaux.module.css";

/**
 * « CinéMatch » en deux couleurs, comme dans le menu (21/10/2026, Sarah) :
 * « Ciné » reste au rouge WeFilmGood, « Match » suit l'horloge des
 * engagements (var(--engagement)), la même que le logo de la bande blanche.
 * À côté du titre, les anneaux entrelacés qui tournent (13/11/2026, Sarah).
 */
export default function TitreCineMatch() {
  return (
    <>
      <span style={{ color: ROUGE_WFG }}>Ciné</span>
      <span style={{ color: "var(--engagement, #da2c25)" }}>Match</span>
      <span className={styles.anneaux} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </>
  );
}
