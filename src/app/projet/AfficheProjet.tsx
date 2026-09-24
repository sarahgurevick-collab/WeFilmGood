"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./affiche.module.css";

/**
 * L'affiche du projet : la fiche telle que la verra un producteur.
 *
 * Sur le bloc « La fiche », elle se remplit pendant que l'auteur tape —
 * elle écoute les champs du formulaire voisin (titre, tagline, format,
 * genre…). Sur les autres blocs, elle montre ce qui est enregistré. Ce
 * qui manque apparaît en pointillés.
 */
export type ValeursAffiche = {
  title: string;
  logline: string;
  synopsis: string;
  format: string;
  genre_slug: string;
  budget_range: string;
  target_audience: string;
  has_awards: boolean;
};

const CHAMPS = new Set<keyof ValeursAffiche>([
  "title",
  "logline",
  "synopsis",
  "format",
  "genre_slug",
  "budget_range",
  "target_audience",
  "has_awards",
]);

export default function AfficheProjet({
  initial,
  libelles,
  vignette,
  enDirect,
  lienFiche,
}: {
  initial: ValeursAffiche;
  /** Libellés lisibles des valeurs des menus : format, genre, budget, audience. */
  libelles: Record<string, string>;
  vignette: string | null;
  /** true sur le bloc « La fiche » : l'affiche suit le formulaire. */
  enDirect: boolean;
  /** Lien vers le bloc qui remplit ce qui manque, hors bloc « La fiche ». */
  lienFiche: string | null;
}) {
  const [v, setV] = useState(initial);

  useEffect(() => {
    if (!enDirect) return;
    const suivre = (e: Event) => {
      const champ = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const nom = champ.name as keyof ValeursAffiche;
      if (!CHAMPS.has(nom)) return;
      const valeur =
        champ instanceof HTMLInputElement && champ.type === "checkbox" ? champ.checked : champ.value;
      setV((avant) => ({ ...avant, [nom]: valeur }));
    };
    document.addEventListener("input", suivre);
    document.addEventListener("change", suivre);
    return () => {
      document.removeEventListener("input", suivre);
      document.removeEventListener("change", suivre);
    };
  }, [enDirect]);

  const manque = (texte: string) =>
    lienFiche ? (
      <Link href={lienFiche} className={styles.manque}>
        {texte}
      </Link>
    ) : (
      <span className={styles.manque}>{texte}</span>
    );

  const pastilles = [v.format, v.genre_slug, v.target_audience, v.budget_range]
    .filter(Boolean)
    .map((valeur) => libelles[valeur] ?? valeur);

  return (
    <section className={styles.affiche} aria-label="Aperçu de la fiche">
      <p className={styles.surtitre}>Ce que voit un talent connecté</p>

      <div className={styles.image}>
        {vignette ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vignette} alt="" />
        ) : (
          <span className={styles.imageVide}>Image de présentation</span>
        )}
        {v.has_awards && <span className={styles.prime}>Primé</span>}
      </div>

      <p className={styles.titre}>{v.title.trim() || manque("Titre du projet")}</p>

      <p className={styles.tagline}>{v.logline.trim() || manque("+ votre tagline")}</p>

      <div className={styles.pastilles}>
        {pastilles.map((p) => (
          <span key={p} className={styles.pastille}>
            {p}
          </span>
        ))}
        {!v.format && <span className={`${styles.pastille} ${styles.pastilleVide}`}>+ format</span>}
        {!v.genre_slug && <span className={`${styles.pastille} ${styles.pastilleVide}`}>+ genre</span>}
      </div>

      <p className={styles.logline}>{v.synopsis.trim() || manque("+ votre logline, l'histoire en quelques phrases")}</p>
    </section>
  );
}
