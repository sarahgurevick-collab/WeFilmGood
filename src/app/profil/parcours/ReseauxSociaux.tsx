"use client";

import { useState } from "react";
import formStyles from "@/components/form.module.css";
import styles from "./ReseauxSociaux.module.css";

type Reseau = { slug: string; label: string };

/**
 * Un menu déroulant pour choisir un réseau, et autant de lignes qu'on
 * veut : on ajoute un réseau à la fois, jamais les quatre d'un coup.
 * Chaque ligne garde le nom de champ attendu par saveParcours
 * (`social_<slug>`) ; retirer une ligne vide le champ, ce que l'action
 * lit déjà comme « rien à enregistrer ici ».
 */
export default function ReseauxSociaux({
  reseaux,
  valeurs,
}: {
  reseaux: Reseau[];
  valeurs: Record<string, string>;
}) {
  const [lignes, setLignes] = useState<string[]>(
    reseaux.filter((r) => valeurs[r.slug]).map((r) => r.slug),
  );
  const [choix, setChoix] = useState("");

  const disponibles = reseaux.filter((r) => !lignes.includes(r.slug));

  const ajouter = () => {
    if (!choix) return;
    setLignes((l) => [...l, choix]);
    setChoix("");
  };

  const retirer = (slug: string) => setLignes((l) => l.filter((s) => s !== slug));

  return (
    <div className={formStyles.field}>
      <span>Réseaux et sites professionnels</span>

      {lignes.map((slug) => {
        const reseau = reseaux.find((r) => r.slug === slug);
        if (!reseau) return null;
        return (
          <div key={slug} className={styles.ligne}>
            <span className={styles.nom}>{reseau.label}</span>
            <input
              type="url"
              name={`social_${slug}`}
              defaultValue={valeurs[slug] ?? ""}
              placeholder="https://"
              className={styles.url}
            />
            <button
              type="button"
              onClick={() => retirer(slug)}
              className={styles.retirer}
              aria-label={`Retirer ${reseau.label}`}
            >
              ×
            </button>
          </div>
        );
      })}

      {disponibles.length > 0 && (
        <div className={styles.ajout}>
          <select
            value={choix}
            onChange={(e) => setChoix(e.target.value)}
            aria-label="Choisir un réseau à ajouter"
          >
            <option value="">Ajouter un réseau…</option>
            {disponibles.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={ajouter} disabled={!choix} className={styles.boutonAjouter}>
            Ajouter
          </button>
        </div>
      )}
    </div>
  );
}
