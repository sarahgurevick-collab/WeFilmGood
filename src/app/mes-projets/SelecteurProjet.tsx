"use client";

import { useRouter } from "next/navigation";
import styles from "./page.module.css";

/** Le sélecteur de projet, quand un membre en a plusieurs : changer de projet change la page. */
export default function SelecteurProjet({
  projets,
  courant,
}: {
  projets: { id: string; titre: string }[];
  courant: string;
}) {
  const router = useRouter();
  return (
    <label className={styles.selecteur}>
      <span>Projet</span>
      <select value={courant} onChange={(e) => router.push(`/mes-projets?projet=${e.target.value}`)}>
        {projets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.titre}
          </option>
        ))}
      </select>
    </label>
  );
}
