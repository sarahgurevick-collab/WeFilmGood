"use client";

import { useEffect, useState } from "react";
import RoueTitres from "@/components/RoueTitres";
import lecteur from "@/components/MasterclassLecteur.module.css";
import styles from "./tutoriels.module.css";

export type FilmTutoriel = {
  slug: string;
  titre: string;
  /** La précision après le tiret du titre (« auteur », « producteur »), en petit sous le titre. */
  precision?: string;
  video: string;
  affiche: string;
};

/**
 * Les tutoriels présentés comme les masterclass (25/11/2026, Sarah) : l'écran
 * à gauche, la roue des titres à droite. Le titre du centre est le film
 * montré. Une adresse /tutoriels#galaxies (roue d'adhésion) ouvre ce film-là.
 */
export default function TutorielsLecteur({ films }: { films: FilmTutoriel[] }) {
  const [slug, setSlug] = useState(films[0]?.slug ?? "");

  useEffect(() => {
    const lireAncre = () => {
      const ancre = decodeURIComponent(window.location.hash.slice(1));
      if (ancre && films.some((f) => f.slug === ancre)) setSlug(ancre);
    };
    lireAncre();
    window.addEventListener("hashchange", lireAncre);
    return () => window.removeEventListener("hashchange", lireAncre);
  }, [films]);

  const actuel = films.find((f) => f.slug === slug) ?? films[0];
  if (!actuel) return null;

  return (
    <div className={lecteur.lecteur}>
      <div className={lecteur.ecran}>
        <video
          key={actuel.slug}
          className={styles.video}
          controls
          preload="metadata"
          playsInline
          poster={actuel.affiche}
          src={actuel.video}
          title={actuel.titre}
        />
      </div>
      <RoueTitres
        titres={films.map((f) => ({ id: f.slug, label: f.titre, apres: f.precision }))}
        valeur={actuel.slug}
        onChange={setSlug}
        etiquette="Choisir un tutoriel"
        petite
      />
    </div>
  );
}
