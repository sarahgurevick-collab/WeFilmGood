"use client";

import { useState } from "react";
import formStyles from "./form.module.css";
import styles from "./ChampAvecCompteur.module.css";

/**
 * Champ de texte avec une limite de caractères visible pendant la frappe.
 *
 * L'ancienne plateforme proposait la tagline dans une fente d'une seule
 * ligne : les auteurs y collaient des paragraphes entiers sans voir leur
 * texte (88 % des "loglines" importées font plus de 150 caractères). D'où
 * le cadre de plusieurs lignes et le décompte affiché.
 */
export default function ChampAvecCompteur({
  nom,
  libelle,
  indication,
  limite,
  lignes = 3,
  valeurInitiale = "",
  requis = false,
}: {
  nom: string;
  libelle: string;
  indication?: string;
  limite: number;
  lignes?: number;
  valeurInitiale?: string;
  requis?: boolean;
}) {
  const [valeur, setValeur] = useState(valeurInitiale);
  const restants = limite - valeur.length;

  return (
    <label className={formStyles.field}>
      <span>
        {libelle}
        {requis ? " *" : ""}
      </span>
      <textarea
        name={nom}
        rows={lignes}
        maxLength={limite}
        placeholder={indication}
        required={requis}
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
      />
      <span
        className={`${styles.compteur} ${restants <= 30 ? styles.bientotPlein : ""}`}
        aria-live="polite"
      >
        {restants} caractère{restants > 1 ? "s" : ""} restant
        {restants > 1 ? "s" : ""}
      </span>
    </label>
  );
}
