"use client";

import { createContext, useContext } from "react";
import { motion } from "framer-motion";
import type { Filtres } from "./filtres";
import styles from "./projets.module.css";

/**
 * Les tags de la recherche avancée (02/11, choix de Sarah, modèle « Tags
 * Selector » de 21st.dev) : une ligne par famille, une couleur par famille,
 * un seul tag par famille. Le tag choisi quitte sa ligne et monte dans la
 * barre de recherche ; sa croix × le fait redescendre.
 */
export type Famille = "format" | "genre" | "audience" | "budget";

export const FAMILLES: Famille[] = ["format", "genre", "audience", "budget"];

/** Format en bleu, genre en rouge, audience en jaune, budget en vert. */
export const COULEUR: Record<Famille, string> = {
  format: styles.tagBleu,
  genre: styles.tagRouge,
  audience: styles.tagJaune,
  budget: styles.tagVert,
};

export type Tag = { famille: Famille; valeur: string; libelle: string };

/** Les règles de Sarah : un court métrage n'a ni audience ni budget, et l'inverse. */
export function familleCachee(famille: Famille, f: Filtres) {
  if (famille === "audience" || famille === "budget") return f.format === "court_metrage";
  return false;
}
export function tagCache(t: Tag, f: Filtres) {
  return t.famille === "format" && t.valeur === "court_metrage" && Boolean(f.audience || f.budget);
}

type Contexte = {
  filtres: Filtres;
  tags: Tag[];
  choisir: (famille: Famille, valeur: string | null) => void;
  /** « Tout effacer » : tous les filtres, y compris ceux de l'adresse seule (?bandeau=…). */
  effacer: () => void;
};

export const FiltresContexte = createContext<Contexte | null>(null);

export function useFiltres() {
  return useContext(FiltresContexte);
}

/** Un tag : contour coloré dans sa ligne, rempli de sa couleur une fois choisi. */
export function BoutonTag({ tag, choisi, onClick }: { tag: Tag; choisi: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      layout
      layoutId={`tag-${tag.famille}-${tag.valeur}`}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className={`${styles.tag} ${COULEUR[tag.famille]} ${choisi ? styles.tagChoisi : ""}`}
      onClick={onClick}
      aria-pressed={choisi}
      aria-label={choisi ? `Retirer ${tag.libelle}` : tag.libelle}
    >
      {tag.libelle}
      {choisi && (
        <span className={styles.tagCroix} aria-hidden="true">
          ×
        </span>
      )}
    </motion.button>
  );
}

/** Les tags choisis, dans la barre de recherche. */
export function TagsChoisis() {
  const ctx = useFiltres();
  if (!ctx) return null;
  const choisis = ctx.tags.filter((t) => ctx.filtres[t.famille] === t.valeur);
  if (choisis.length === 0) return null;
  return (
    <span className={styles.tagsChoisis}>
      {choisis.map((t) => (
        <BoutonTag key={`${t.famille}-${t.valeur}`} tag={t} choisi onClick={() => ctx.choisir(t.famille, null)} />
      ))}
    </span>
  );
}
