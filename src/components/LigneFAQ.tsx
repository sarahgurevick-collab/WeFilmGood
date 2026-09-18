"use client";

import { useState, type ReactNode } from "react";
import styles from "./LigneFAQ.module.css";

export default function LigneFAQ({
  question,
  children,
}: {
  question: string;
  children: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className={styles.ligne}>
      <button
        type="button"
        className={styles.entete}
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
      >
        <span>{question}</span>
        <span
          className={`${styles.fleche} ${ouvert ? styles.ouverte : ""}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {ouvert && <div className={styles.contenu}>{children}</div>}
    </div>
  );
}
