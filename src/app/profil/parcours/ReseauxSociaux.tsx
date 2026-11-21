"use client";

import { useState } from "react";
import formStyles from "@/components/form.module.css";
import styles from "./ReseauxSociaux.module.css";

type Reseau = { slug: string; label: string; exemple?: string };

/**
 * Un menu déroulant pour choisir un réseau, et autant de lignes qu'on
 * veut : on ajoute un réseau à la fois, jamais tous d'un coup.
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
  // Un seul réseau proposé : sa ligne est ouverte d'office, sans menu ;
  // la case laissée vide n'enregistre rien.
  const seul = reseaux.length === 1;
  const [lignes, setLignes] = useState<string[]>(
    seul ? [reseaux[0].slug] : reseaux.filter((r) => valeurs[r.slug]).map((r) => r.slug),
  );
  const [dernier, setDernier] = useState("");
  const disponibles = reseaux.filter((r) => !lignes.includes(r.slug));

  // Choisir dans le menu suffit : la ligne s'ouvre aussitôt, prête à
  // recevoir le lien (20/11, Sarah — le bouton « Ajouter » passait inaperçu).
  const ajouter = (slug: string) => {
    if (!slug) return;
    setLignes((l) => [...l, slug]);
    setDernier(slug);
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
              type="text"
              inputMode="url"
              name={`social_${slug}`}
              defaultValue={valeurs[slug] ?? ""}
              placeholder={reseau.exemple ?? "https://"}
              autoFocus={slug === dernier}
              className={styles.url}
            />
{!seul && (
              <button
              type="button"
              onClick={() => retirer(slug)}
              className={styles.retirer}
              aria-label={`Retirer ${reseau.label}`}
            >
              Retirer
            </button>
            )}
          </div>
        );
      })}

      {disponibles.length > 0 && (
        <div className={styles.ajout}>
          <select value="" onChange={(e) => ajouter(e.target.value)} aria-label="Choisir un réseau à ajouter">
            <option value="">Ajouter un réseau…</option>
            {disponibles.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
