"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  tagline: string;
  logline: string;
  format: string;
  genre_slug: string;
  budget_range: string;
  target_audience: string;
  has_awards: boolean;
};

const CHAMPS = new Set<keyof ValeursAffiche>([
  "title",
  "tagline",
  "logline",
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
  lienComplet,
}: {
  initial: ValeursAffiche;
  /** Libellés lisibles des valeurs des menus : format, genre, budget, audience. */
  libelles: Record<string, string>;
  vignette: string | null;
  /** true sur le bloc « La fiche » : l'affiche suit le formulaire. */
  enDirect: boolean;
  /** Lien vers le bloc qui remplit ce qui manque, hors bloc « La fiche ». */
  lienFiche: string | null;
  /** La fiche complète, ouverte d'un clic sur l'affiche (le « zoom ») ; null pour une fiche pas encore créée. */
  lienComplet: string | null;
}) {
  const router = useRouter();
  // Une saisie pas encore enregistrée : le zoom quitterait la page et la
  // perdrait. On demande d'enregistrer d'abord (01/10).
  const saisieEnCours = useRef(false);
  const [avertir, setAvertir] = useState(false);

  useEffect(() => {
    const noter = () => {
      saisieEnCours.current = true;
    };
    document.addEventListener("input", noter);
    document.addEventListener("change", noter);
    return () => {
      document.removeEventListener("input", noter);
      document.removeEventListener("change", noter);
    };
  }, []);

  const zoomer = (cible: EventTarget | null) => {
    if (!lienComplet) return;
    // Un lien « ce qui manque » dans l'affiche garde son propre chemin.
    if (cible instanceof Element && cible.closest("a")) return;
    if (saisieEnCours.current) {
      setAvertir(true);
      return;
    }
    router.push(lienComplet);
  };

  const [v, setV] = useState(initial);
  // L'image choisie dans le formulaire, montrée avant même l'envoi.
  const [apercu, setApercu] = useState<string | null>(null);

  useEffect(() => {
    if (!enDirect) return;
    const suivre = (e: Event) => {
      const champ = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (champ instanceof HTMLInputElement && champ.type === "file" && champ.name === "vignette") {
        const fichier = champ.files?.[0];
        setApercu(fichier ? URL.createObjectURL(fichier) : null);
        return;
      }
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
    <section
      className={lienComplet ? `${styles.affiche} ${styles.afficheZoom}` : styles.affiche}
      aria-label="Aperçu de la fiche"
      {...(lienComplet
        ? {
            role: "link",
            tabIndex: 0,
            onClick: (e: React.MouseEvent) => zoomer(e.target),
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" && e.target === e.currentTarget) zoomer(null);
            },
          }
        : {})}
    >
      <p className={styles.surtitre}>Ce que voit un talent connecté</p>

      <div className={styles.image}>
        {apercu ?? vignette ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(apercu ?? vignette)!} alt="" />
        ) : (
          <span className={styles.imageVide}>Image de présentation</span>
        )}
        {v.has_awards && <span className={styles.prime}>Primé</span>}
      </div>

      <p className={styles.titre}>{v.title.trim() || manque("Titre du projet")}</p>

      <p className={styles.tagline}>{v.tagline.trim() || manque("+ votre tagline")}</p>

      <div className={styles.pastilles}>
        {pastilles.map((p) => (
          <span key={p} className={styles.pastille}>
            {p}
          </span>
        ))}
        {!v.format && <span className={`${styles.pastille} ${styles.pastilleVide}`}>+ format</span>}
        {!v.genre_slug && <span className={`${styles.pastille} ${styles.pastilleVide}`}>+ genre</span>}
      </div>

      <p className={styles.logline}>{v.logline.trim() || manque("+ votre logline, l'histoire en quelques phrases")}</p>

      {avertir && (
        <p className={styles.avantZoom} role="alert">
          Enregistrez vos modifications avant d&apos;ouvrir la fiche complète.
        </p>
      )}
    </section>
  );
}
