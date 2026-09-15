"use client";

import { useState } from "react";
import formStyles from "@/components/form.module.css";
import styles from "../lecteur.module.css";

export default function ScoreSlider() {
  const [score, setScore] = useState(100);

  return (
    <div className={formStyles.field}>
      <span>
        Note : {score} / 200 {score > 150 && <em className={styles.labelled}>— labellisé</em>}
      </span>
      <input
        type="range"
        name="score"
        min={0}
        max={200}
        step={1}
        value={score}
        onChange={(e) => setScore(Number(e.target.value))}
        className={styles.slider}
      />
    </div>
  );
}
