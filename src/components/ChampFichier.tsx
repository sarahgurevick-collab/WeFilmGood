"use client";

import { useState, type ChangeEvent, type InputHTMLAttributes, type Ref } from "react";
import { useLangueDuGlobe } from "@/lib/langue-globe";
import styles from "./ChampFichier.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  ref?: Ref<HTMLInputElement>;
  /** Repère de la visite guidée : posé sur le bouton visible, pas sur le
      champ masqué (qui ne fait qu'un pixel). */
  "data-visite"?: string;
  /** Allège les images dans le navigateur dès qu'elles sont choisies (1600 px, JPEG) :
      des photos de téléphone à plusieurs Mo, envoyées ensemble, dépassaient la limite
      d'une requête (25 Mo) et l'envoi échouait sans rien dire (22/11). */
  alleger?: boolean;
};

const LARGEUR_MAX = 1600;

async function reduire(f: File): Promise<File> {
  if (!f.type.startsWith("image/") || f.size < 400 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f, { imageOrientation: "from-image" });
    const k = Math.min(1, LARGEUR_MAX / bmp.width);
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    const ctx = c.getContext("2d");
    if (!ctx) return f;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= f.size) return f;
    return new File([blob], f.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return f;
  }
}

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
export default function ChampFichier({ onChange, multiple, alleger, "data-visite": visite, ...reste }: Props) {
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
        onChange={async (e: ChangeEvent<HTMLInputElement>) => {
          const champ = e.target;
          let fichiers = Array.from(champ.files ?? []);
          if (alleger && fichiers.length) {
            setNoms(fichiers.map((f) => f.name));
            fichiers = await Promise.all(fichiers.map(reduire));
            const lot = new DataTransfer();
            fichiers.forEach((f) => lot.items.add(f));
            champ.files = lot.files;
          }
          setNoms(fichiers.map((f) => f.name));
          onChange?.(e);
        }}
        {...reste}
      />
      <span className={styles.bouton} aria-hidden="true">{bouton}</span>
      <span className={styles.nom}>{noms.length ? noms.join(", ") : aucun}</span>
    </span>
  );
}
