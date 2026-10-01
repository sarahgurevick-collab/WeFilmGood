"use client";

import { useRouter } from "next/navigation";
import styles from "./page.module.css";

/**
 * Le sélecteur de projet : changer de projet change la page. La création
 * d'une fiche est la dernière ligne de la liste (01/10) : l'auteur voit
 * d'abord ses fiches — sur WFG 1, beaucoup en recréaient une pour le
 * même projet.
 */
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
      <select value={courant} onChange={(e) =>
          router.push(e.target.value === "nouveau" ? "/projet" : `/mes-projets?projet=${e.target.value}`)
        }
      >
        {projets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.titre}
          </option>
        ))}
        <option value="nouveau">+ Nouvelle fiche projet</option>
      </select>
    </label>
  );
}
