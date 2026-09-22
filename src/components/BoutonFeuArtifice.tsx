"use client";

import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import FeuArtifice from "./FeuArtifice";
import styles from "./BoutonFeuArtifice.module.css";

const DELAI_ENVOI = 1500;

/**
 * Bouton d'envoi qui fait d'abord éclater un feu d'artifice, puis envoie le
 * formulaire : sans ce délai, le changement de page couperait les gerbes.
 * Un formulaire incomplet est laissé au navigateur, sans fête.
 */
export default function BoutonFeuArtifice({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [lance, setLance] = useState(false);
  const envoiAutorise = useRef(false);

  const auClic = (e: MouseEvent<HTMLButtonElement>) => {
    const form = e.currentTarget.form;
    if (!form || envoiAutorise.current) return;
    if (!form.checkValidity()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    e.preventDefault();
    if (lance) return;
    setLance(true);
    const bouton = e.currentTarget;
    window.setTimeout(() => {
      envoiAutorise.current = true;
      form.requestSubmit(bouton);
    }, DELAI_ENVOI);
  };

  return (
    <div className={styles.cadre}>
      {lance && <FeuArtifice />}
      <button type="submit" className={className} onClick={auClic}>
        {children}
      </button>
    </div>
  );
}
