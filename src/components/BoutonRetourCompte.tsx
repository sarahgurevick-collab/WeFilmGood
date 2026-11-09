"use client";

import { useFormStatus } from "react-dom";
import styles from "./BandeauIncarnation.module.css";

/**
 * « Revenir à mon compte » : dès le clic, le bouton pâlit et ne répond plus,
 * le temps que l'écran d'arrivée se charge. Le 09/11, rien ne bougeait
 * pendant plusieurs secondes : un second clic, et l'administratrice était
 * déconnectée.
 */
export default function BoutonRetourCompte() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.retour} disabled={pending} aria-busy={pending}>
      Revenir à mon compte
    </button>
  );
}
