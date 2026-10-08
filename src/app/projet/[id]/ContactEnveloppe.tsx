"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./contact.module.css";

const ENVELOPPE = (
  <svg viewBox="0 0 24 24" className={styles.dessin} aria-hidden="true">
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3.5 7.5 12 13.5 20.5 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Pour écrire à l'auteur, à l'autrice ou au producteur d'un projet (03/10,
 * Sarah) : une enveloppe, comprise au premier regard, à la place du bouton
 * « Contacter l'auteur » — le porteur d'un projet peut être une autrice, ou
 * un producteur en recherche de coproducteur.
 *
 * Sans adhésion, l'enveloppe est barrée : au survol (ou au toucher, sur
 * téléphone), une bulle explique pourquoi, et mène à l'adhésion.
 */
export default function ContactEnveloppe({
  href,
  adhesionRequise = false,
  indisponible,
}: {
  /** Où mène l'enveloppe : l'écran de message, le projet déjà indiqué. */
  href: string;
  /** Barrée, avec sa bulle, tant que le membre n'a pas d'adhésion. */
  adhesionRequise?: boolean;
  /**
   * Messagerie fermée par un producteur ou un comédien très sollicité (08/10) :
   * l'enveloppe est barrée, la bulle donne ce texte (provisoire, Sarah cherche
   * la formulation) et n'est pas un lien.
   */
  indisponible?: string;
}) {
  const [ouverte, setOuverte] = useState(false);
  const zone = useRef<HTMLSpanElement>(null);

  // La bulle se referme d'un clic à côté, ou avec Échap.
  useEffect(() => {
    if (!ouverte) return;
    const dehors = (e: Event) => {
      if (!zone.current?.contains(e.target as Node)) setOuverte(false);
    };
    const touche = (e: KeyboardEvent) => e.key === "Escape" && setOuverte(false);
    document.addEventListener("pointerdown", dehors);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("pointerdown", dehors);
      document.removeEventListener("keydown", touche);
    };
  }, [ouverte]);

  if (!adhesionRequise && indisponible) {
    return (
      <span ref={zone} className={styles.zone}>
        <button
          type="button"
          className={`${styles.enveloppe} ${styles.barree}`}
          aria-expanded={ouverte}
          aria-label="Contacter, messagerie indisponible"
          onClick={() => setOuverte((v) => !v)}
        >
          {ENVELOPPE}
          <span className={styles.barre} aria-hidden="true" />
        </button>
        <span className={`${styles.bulle} ${ouverte ? styles.bulleOuverte : ""}`} role="status">
          {indisponible}
        </span>
      </span>
    );
  }

  if (!adhesionRequise) {
    return (
      <Link href={href} className={styles.enveloppe} aria-label="Contacter">
        {ENVELOPPE}
      </Link>
    );
  }

  return (
    <span ref={zone} className={styles.zone}>
      <button
        type="button"
        className={`${styles.enveloppe} ${styles.barree}`}
        aria-expanded={ouverte}
        aria-label="Contacter, adhésion requise"
        onClick={() => setOuverte((v) => !v)}
      >
        {ENVELOPPE}
        <span className={styles.barre} aria-hidden="true" />
      </button>
      {/* Phrase validée par Sarah : rien d'autre, pas un mot sur la validation. */}
      <span className={`${styles.bulle} ${ouverte ? styles.bulleOuverte : ""}`} role="status">
        <Link href="/adhesion">Pour contacter cet auteur, vous avez besoin d&apos;une adhésion.</Link>
      </span>
    </span>
  );
}
