"use client";

import { useState } from "react";
import type { ArticlePresse } from "@/data/presse";
import formStyles from "./form.module.css";
import RoueTitres from "./RoueTitres";
import styles from "./PresseLecteur.module.css";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « 2015-06-01 » → « 1 juin 2015 ». */
function dateLisible(iso: string): string {
  const [a, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${a}`;
}

/**
 * Les articles de presse (26/11/2026, Sarah) : comme les masterclass,
 * l'article ouvert à gauche et la roue des titres à droite — le journal,
 * avec l'année dessous.
 */
export default function PresseLecteur({ articles }: { articles: ArticlePresse[] }) {
  const [id, setId] = useState(articles[0]?.id ?? "");
  const actuel = articles.find((a) => a.id === id) ?? articles[0];
  if (!actuel) return null;

  const titres = articles.map((a) => ({ id: a.id, label: a.journal, apres: a.date.slice(0, 4) }));

  return (
    <div className={styles.lecteur}>
      <article key={actuel.id} className={styles.article}>
        <p className={styles.journal}>
          {actuel.journal} <span>· {dateLisible(actuel.date)}</span>
        </p>
        <h2 className={styles.titre}>{actuel.titre}</h2>
        <p className={styles.resume}>{actuel.resume}</p>
        {actuel.citations?.map((c) => (
          <blockquote key={c} className={styles.citation}>
            « {c} »
          </blockquote>
        ))}
        {actuel.auteur && <p className={styles.auteur}>Propos recueillis par {actuel.auteur}</p>}
        {actuel.lien && (
          <a href={actuel.lien} target="_blank" rel="noopener noreferrer" className={`${formStyles.submit} ${styles.bouton}`}>
            Lire l’article
          </a>
        )}
      </article>
      <RoueTitres titres={titres} valeur={actuel.id} onChange={setId} etiquette="Choisir un article" />
    </div>
  );
}
