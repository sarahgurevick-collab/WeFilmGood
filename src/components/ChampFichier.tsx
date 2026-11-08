"use client";

import { useState, type ChangeEvent, type InputHTMLAttributes, type Ref } from "react";
import { useLangueDuGlobe } from "@/lib/langue-globe";
import styles from "./ChampFichier.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  ref?: Ref<HTMLInputElement>;
  /** Repère de la visite guidée : posé sur le bouton visible, pas sur le
      champ masqué (qui ne fait qu'un pixel). */
  "data-visite"?: string;
};

/**
 * Un champ « fichier » dont le bouton suit la langue du globe.
 *
 * Le bouton natif (« Choisir un fichier », « Aucun fichier choisi ») est
 * écrit par le navigateur dans SA langue, et Google Traduction ne peut pas
 * le traduire : un membre qui lit le site en anglais le voyait en
 * français (Sarah, 08/11). Le champ natif reste là, masqué, pour le
 * clavier et l'envoi du formulaire ; on affiche à sa place les mêmes mots,
 * en français ou en anglais, protégés de la traduction automatique.
 * S'emploie dans une <label> comme le champ natif qu'il remplace.
 */
export default function ChampFichier({ onChange, multiple, "data-visite": visite, ...reste }: Props) {
  const langue = useLangueDuGlobe();
  const [noms, setNoms] = useState<string[]>([]);
  const en = langue === "en";
  const bouton = multiple
    ? en ? "Choose files" : "Choisir des fichiers"
    : en ? "Choose a file" : "Choisir un fichier";
  const aucun = en ? "No file chosen" : "Aucun fichier choisi";

  return (
    <span className={`${styles.champ} notranslate`} translate="no" data-visite={visite}>
      <input
        type="file"
        multiple={multiple}
        className={styles.cache}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setNoms(Array.from(e.target.files ?? []).map((f) => f.name));
          onChange?.(e);
        }}
        {...reste}
      />
      <span className={styles.bouton} aria-hidden="true">{bouton}</span>
      <span className={styles.nom}>{noms.length ? noms.join(", ") : aucun}</span>
    </span>
  );
}
