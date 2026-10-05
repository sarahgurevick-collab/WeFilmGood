"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import type { NoeudOrbite, ProjetOrbite } from "@/lib/orbite";
import RechercheAccueil from "./RechercheAccueil";
import styles from "./GalaxieAccueil.module.css";

/**
 * L'en-tête de l'accueil : « Explorez l'Univers WeFilmGood ».
 *
 * Un projet au centre, comme un soleil ; ses personnages tournent sur le
 * premier cercle, son équipe sur le second. Chaque rond se présente à
 * tour de rôle dans une bulle, pour qu'on comprenne les deux cercles sans
 * explication. Un clic arrête l'orbite et ouvre la fiche du rond.
 *
 * La scène est dessinée sur 700 × 700 et se réduit en pourcentages : les
 * positions sont calculées ici, une fois pour toutes.
 */
const SCENE = 700;
const RAYON_PERSONNAGES = 190;
const RAYON_EQUIPE = 300;
const TAILLE_PERSONNAGE = 88;
const TAILLE_EQUIPE = 100;
const CADENCE_BULLE_MS = 2600;

type Place = NoeudOrbite & { style: CSSProperties; famille: "personnage" | "equipe" };

function placer(
  noeuds: NoeudOrbite[],
  rayon: number,
  taille: number,
  depart: number,
  famille: Place["famille"],
): Place[] {
  return noeuds.map((n, i) => {
    const angle = depart + (i * 2 * Math.PI) / noeuds.length;
    const x = SCENE / 2 + rayon * Math.cos(angle) - taille / 2;
    const y = SCENE / 2 + rayon * Math.sin(angle) - taille / 2;
    return {
      ...n,
      famille,
      style: {
        left: `${(x / SCENE) * 100}%`,
        top: `${(y / SCENE) * 100}%`,
        width: `${(taille / SCENE) * 100}%`,
      },
    };
  });
}

/** Personnage, talent, personnage, talent… puis le reste. */
function alterner(a: Place[], b: Place[]): Place[] {
  const tour: Place[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) tour.push(a[i]);
    if (b[i]) tour.push(b[i]);
  }
  return tour;
}

export default function GalaxieAccueil({ projet }: { projet: ProjetOrbite | null }) {
  const [choix, setChoix] = useState<Place | null>(null);
  const [vedette, setVedette] = useState(0);

  const personnages = projet
    ? placer(projet.personnages, RAYON_PERSONNAGES, TAILLE_PERSONNAGE, -Math.PI / 2, "personnage")
    : [];
  const equipe = projet
    ? placer(projet.equipe, RAYON_EQUIPE, TAILLE_EQUIPE, -Math.PI / 6, "equipe")
    : [];
  const tour = alterner(personnages, equipe);
  const nomEnVedette = choix ? null : tour[vedette % Math.max(tour.length, 1)]?.id;

  useEffect(() => {
    if (choix || tour.length === 0) return;
    const minuteur = setInterval(() => setVedette((v) => (v + 1) % tour.length), CADENCE_BULLE_MS);
    return () => clearInterval(minuteur);
  }, [choix, tour.length]);

  const rond = (n: Place) => (
    <div key={n.id} className={styles.place} style={n.style}>
      <div className={styles.droit}>
        <button
          type="button"
          className={`${styles.noeud} ${styles[n.famille]} ${choix?.id === n.id ? styles.choisi : ""}`}
          onClick={() => setChoix(n)}
          aria-label={`${n.nom}, ${n.etiquette}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={n.image} alt="" />
        </button>
        {nomEnVedette === n.id && (
          <span className={styles.bulle} aria-hidden="true">
            <span className={`${styles.bulleEtiquette} ${styles[n.famille]}`}>{n.etiquette}</span>
            <span className={styles.bulleNom}>{n.nom}</span>
          </span>
        )}
      </div>
    </div>
  );

  return (
    <section className={styles.galaxie}>
      <div className={styles.texte}>
        <h1 className={styles.titre}>
          Explorez l’Univers <span className={styles.rouge}>We</span>Film
          <span className={styles.rouge}>Good</span>
        </h1>
        <p className={styles.sousTitre}>
          Bienvenue dans votre nouvelle galaxie de projets.
          <br />
          Découvrez les planètes Talents, Personnages, Casting…
        </p>
        <RechercheAccueil
          sombre
          placeholder="Rechercher un personnage, un comédien ou un projet…"
        />
      </div>

      {projet && (
        <div className={styles.cadreScene}>
          <div className={`${styles.scene} ${choix ? styles.enPause : ""}`}>
            <svg className={styles.cercles} viewBox="0 0 700 700" aria-hidden="true">
              <circle cx="350" cy="350" r={RAYON_PERSONNAGES} className={styles.cerclePersonnages} />
              <circle cx="350" cy="350" r={RAYON_EQUIPE} className={styles.cercleEquipe} />
            </svg>

            <Link href={`/projet/${projet.id}`} className={styles.centre}>
              <span className={styles.centreGenre}>
                Projet{projet.genre ? ` · ${projet.genre}` : ""}
              </span>
              <span className={styles.centreTitre}>{projet.titre}</span>
              <span className={styles.centreLogline}>{projet.tagline}</span>
            </Link>

            <div className={`${styles.anneau} ${styles.anneauPersonnages}`}>
              {personnages.map(rond)}
            </div>
            <div className={`${styles.anneau} ${styles.anneauEquipe}`}>{equipe.map(rond)}</div>

            <span className={`${styles.nomCercle} ${styles.nomPersonnages}`}>
              <i aria-hidden="true" />
              Les personnages
            </span>
            {equipe.length > 0 && (
              <span className={`${styles.nomCercle} ${styles.nomEquipe}`}>
                <i aria-hidden="true" />
                L’équipe
              </span>
            )}

            {choix && (
              <div className={styles.fiche} role="dialog" aria-label={choix.nom}>
                <div className={styles.ficheHaut}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={choix.image} alt="" className={styles.ficheImage} />
                  <div className={styles.ficheNoms}>
                    <span className={`${styles.bulleEtiquette} ${styles[choix.famille]}`}>
                      {choix.etiquette}
                    </span>
                    <span className={styles.ficheNom}>{choix.nom}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.fermer}
                    onClick={() => setChoix(null)}
                    aria-label="Fermer"
                  >
                    ×
                  </button>
                </div>
                {choix.bio && (
                  <p className={styles.ficheBio}>
                    {choix.bio}
                    {choix.bio.length >= 219 ? "…" : ""}
                  </p>
                )}
                {choix.lien && (
                  <Link href={choix.lien} className={styles.ficheLien}>
                    Voir le profil
                  </Link>
                )}
              </div>
            )}
          </div>

          <p className={styles.legende} aria-hidden="true">
            <span className={styles.nomPersonnagesLegende}>
              <i /> Les personnages
            </span>
            {equipe.length > 0 && (
              <span className={styles.nomEquipeLegende}>
                <i /> L’équipe
              </span>
            )}
          </p>
        </div>
      )}
    </section>
  );
}
