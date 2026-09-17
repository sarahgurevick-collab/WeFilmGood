"use client";

import { useState, type ReactNode } from "react";
import styles from "./SwitchFormat.module.css";

export default function SwitchFormat({
  contenuCourt,
  contenuLong,
}: {
  contenuCourt?: ReactNode;
  contenuLong?: ReactNode;
}) {
  const [format, setFormat] = useState<"court" | "long">("court");

  return (
    <div>
      <nav className={styles.tabs}>
        <button
          type="button"
          className={format === "court" ? styles.tabActive : styles.tab}
          onClick={() => setFormat("court")}
        >
          Court-métrage
        </button>
        <button
          type="button"
          className={format === "long" ? styles.tabActive : styles.tab}
          onClick={() => setFormat("long")}
        >
          Long-métrage
        </button>
      </nav>

      <div className={styles.contenu}>
        {format === "court"
          ? (contenuCourt ?? "Contenu à venir pour le court-métrage.")
          : (contenuLong ?? "Contenu à venir pour le long-métrage.")}
      </div>
    </div>
  );
}
