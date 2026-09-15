import { sanitizeFiche } from "@/lib/sanitize";
import styles from "./FicheContent.module.css";

/**
 * Affiche une fiche de lecture mise en forme. Le HTML est renettoyé à
 * l'affichage : le filtrage à l'enregistrement protège ce qui entre
 * aujourd'hui, celui-ci protège aussi ce qui serait entré autrement.
 */
export default function FicheContent({ html }: { html: string | null }) {
  if (!html) return null;

  return (
    <div
      className={styles.fiche}
      dangerouslySetInnerHTML={{ __html: sanitizeFiche(html) }}
    />
  );
}
