"use client";

import { useState } from "react";
import styles from "./SwitchFormat.module.css";

export default function SwitchFormat() {
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

      <p className={styles.contenu}>
        {format === "court"
          ? "Contenu à venir pour le court-métrage."
          : "Contenu à venir pour le long-métrage."}
      </p>
    </div>
  );
}
