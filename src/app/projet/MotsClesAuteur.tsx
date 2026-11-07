"use client";

import { useState } from "react";
import formStyles from "@/components/form.module.css";
import compteurStyles from "@/components/ChampAvecCompteur.module.css";
import styles from "./mots-cles-auteur.module.css";

/** Dix mots au plus (07/11/2026, Sarah). */
export const MAXIMUM_MOTS_AUTEUR = 10;

/**
 * Les mots-clés choisis par l'auteur, sous la logline (07/11/2026, Sarah) :
 * les mots essentiels pour trouver le projet, qui ne sont pas déjà dans la
 * tagline ni la logline. Un mot s'ajoute à la touche Entrée, à la virgule,
 * ou en quittant le champ ; « Retirer » l'enlève. Le formulaire envoie un
 * champ caché par mot.
 */
export default function MotsClesAuteur({ initiaux }: { initiaux: string[] }) {
  const [mots, setMots] = useState<string[]>(initiaux.slice(0, MAXIMUM_MOTS_AUTEUR));
  const [saisie, setSaisie] = useState("");
  const restants = MAXIMUM_MOTS_AUTEUR - mots.length;

  const ajouter = (brut: string) => {
    const nouveaux = brut
      .split(",")
      .map((m) => m.trim().replace(/\s+/g, " ").slice(0, 60))
      .filter(Boolean);
    if (!nouveaux.length) return;
    setMots((avant) => {
      const liste = [...avant];
      for (const m of nouveaux) {
        if (liste.length >= MAXIMUM_MOTS_AUTEUR) break;
        if (!liste.some((x) => x.toLowerCase() === m.toLowerCase())) liste.push(m);
      }
      return liste;
    });
    setSaisie("");
  };

  return (
    <div className={formStyles.field}>
      <span id="mots-cles-auteur-libelle">Mots clés essentiels pour trouver votre projet</span>
      <span className={formStyles.hint}>
        Il est inutile de mettre un mot clé déjà présent dans la tagline et la logline.
      </span>
      {mots.map((m) => (
        <input key={m} type="hidden" name="mots_cles_auteur" value={m} />
      ))}
      {mots.length > 0 && (
        <ul className={styles.mots}>
          {mots.map((m) => (
            <li key={m} className={styles.mot}>
              <span>{m}</span>
              <button
                type="button"
                className={styles.retirer}
                onClick={() => setMots((avant) => avant.filter((x) => x !== m))}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      {restants > 0 && (
        <input
          aria-labelledby="mots-cles-auteur-libelle"
          type="text"
          maxLength={200}
          value={saisie}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) ajouter(v);
            else setSaisie(v);
          }}
          onKeyDown={(e) => {
            // Entrée ajoute le mot au lieu d'envoyer le formulaire.
            if (e.key === "Enter") {
              e.preventDefault();
              ajouter(saisie);
            }
          }}
          onBlur={() => ajouter(saisie)}
        />
      )}
      <span className={`${compteurStyles.compteur} ${restants === 0 ? compteurStyles.bientotPlein : ""}`} aria-live="polite">
        {restants} mot{restants > 1 ? "s" : ""} restant{restants > 1 ? "s" : ""}
      </span>
    </div>
  );
}
