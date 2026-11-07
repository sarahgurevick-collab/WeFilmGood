import { sanitizeFiche } from "@/lib/sanitize";
import { surlignerHtml } from "@/app/galaxies/mot-trouve";
import styles from "./FicheContent.module.css";

/**
 * Affiche une fiche de lecture mise en forme. Le HTML est renettoyé à
 * l'affichage : le filtrage à l'enregistrement protège ce qui entre
 * aujourd'hui, celui-ci protège aussi ce qui serait entré autrement.
 */
export default function FicheContent({ html, mots = [] }: { html: string | null; mots?: string[] }) {
  if (!html) return null;

  // Les mots cherchés en rouge (02/11, Sarah) : posés APRÈS le nettoyage,
  // qui ne garde pas la balise <mark>.
  return (
    <div
      className={styles.fiche}
      dangerouslySetInnerHTML={{ __html: surlignerHtml(sanitizeFiche(html), mots) }}
    />
  );
}
