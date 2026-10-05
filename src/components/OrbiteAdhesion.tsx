"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ICONES } from "./AvantageAdhesion";
import styles from "./OrbiteAdhesion.module.css";

/**
 * L'adhésion racontée comme la galaxie de l'accueil (05/10, idée de Sarah,
 * qui ne veut pas d'un tableau de prix classique).
 *
 * Le prix au centre, comme un soleil ; ce que l'adhésion donne tourne sur
 * le premier cercle, les services sur le second. Un clic arrête l'orbite
 * et ouvre l'explication du rond. Les explications sont les phrases de la
 * page Adhésion, reprises telles quelles.
 *
 * Même construction que GalaxieAccueil : scène dessinée sur 700 × 700,
 * réduite en pourcentages. La lueur du centre et le rond qui grossit au
 * survol viennent de l'animation « Orbiting Skills » que Sarah a fournie,
 * réécrite sans Tailwind et aux couleurs du site ; les cercles sont restés
 * en pointillés, elle les préfère aux halos.
 */
const SCENE = 700;
const RAYON_ADHESION = 175;
const RAYON_SERVICES = 300;
const TAILLE_ADHESION = 72;
const TAILLE_SERVICE = 84;
const CADENCE_BULLE_MS = 2600;

type Famille = "adhesion" | "service";

type Noeud = {
  id: string;
  nom: string;
  icone: keyof typeof ICONES;
  texte: string;
};

const GALAXIES =
  "La Galaxie WeFilmGood : 1 crédit par jour pour l’une des 3 galaxies — Projets, Talents, Personnages";

const ADHESION: Noeud[] = [
  { id: "galaxie-projet", nom: "La Galaxie Projets", icone: "projets", texte: GALAXIES },
  { id: "galaxie-talent", nom: "La Galaxie Talents", icone: "talents", texte: GALAXIES },
  { id: "galaxie-personnage", nom: "La Galaxie Personnages", icone: "personnages", texte: GALAXIES },
  {
    id: "cinecrush",
    nom: "CinéCrush",
    icone: "coeur",
    texte: "CinéCrush : provoquer le hasard cinématographique.",
  },
  {
    id: "cinematch",
    nom: "CinéMatch",
    icone: "popcorn",
    texte: "CinéMatch : le nom et les réponses de vos matchs (les contacter coûte un crédit)",
  },
  {
    id: "fiche-projet",
    nom: "Fiche projet (illimité)",
    icone: "fiche",
    texte: "Fiches projets illimitées (avec le document PDF du projet, sans analyse)",
  },
  {
    id: "fiche-personnage",
    nom: "Fiche personnage (illimité)",
    icone: "fiche",
    texte: "Fiches personnages illimitées, et les talents associés à vos projets, en illimité",
  },
  {
    id: "scenariolab-spectateur",
    nom: "ScénarioLab (spectateur)",
    icone: "fiole",
    texte: "Le ScénarioLab offert, place prioritaire (limité à 50 places)",
  },
];

const SERVICES: Noeud[] = [
  {
    id: "scenariolab-participant",
    nom: "ScénarioLab (participant)",
    icone: "fiole",
    texte:
      "ScénarioLab de 5 personnes : 500 € (100 € par projet participant). Enregistrement et mise à disposition de la vidéo avec un lien privé.",
  },
  {
    id: "analyse",
    nom: "Analyse de Scénario",
    icone: "nuage",
    texte: "50 € : 1 analyse de document PDF, qui permet d’accéder à la Labellisation du projet.",
  },
  {
    id: "accompagnement",
    nom: "Accompagnement Longue Durée",
    icone: "telephone",
    texte: "500 € : accompagnement longue durée sur un projet.",
  },
];

type Place = Noeud & { style: CSSProperties; famille: Famille };

function placer(
  noeuds: Noeud[],
  rayon: number,
  taille: number,
  depart: number,
  famille: Famille,
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

const PLACES_ADHESION = placer(ADHESION, RAYON_ADHESION, TAILLE_ADHESION, -Math.PI / 2, "adhesion");
const PLACES_SERVICES = placer(SERVICES, RAYON_SERVICES, TAILLE_SERVICE, -Math.PI / 6, "service");
const TOUR = [...PLACES_ADHESION, ...PLACES_SERVICES];

const ETIQUETTE: Record<Famille, string> = { adhesion: "Adhésion", service: "Services" };

export default function OrbiteAdhesion() {
  const [choix, setChoix] = useState<Place | null>(null);
  const [vedette, setVedette] = useState(0);
  const enVedette = choix ? null : TOUR[vedette].id;

  // Sur téléphone, les noms ne tiennent pas tous : chaque rond se présente
  // à tour de rôle, comme sur l'accueil.
  useEffect(() => {
    if (choix) return;
    const minuteur = setInterval(() => setVedette((v) => (v + 1) % TOUR.length), CADENCE_BULLE_MS);
    return () => clearInterval(minuteur);
  }, [choix]);

  const rond = (n: Place) => (
    <div key={n.id} className={styles.place} style={n.style}>
      <div className={styles.droit}>
        <button
          type="button"
          className={`${styles.noeud} ${styles[n.famille]} ${choix?.id === n.id ? styles.choisi : ""}`}
          onClick={() => setChoix(n)}
          aria-label={n.nom}
        >
          {ICONES[n.icone]}
        </button>
        <span
          className={`${styles.nom} ${enVedette === n.id ? styles.enVedette : ""}`}
          aria-hidden="true"
        >
          {n.nom}
        </span>
      </div>
    </div>
  );

  return (
    <section className={styles.orbite}>
      <div className={styles.cadreScene}>
        <div className={`${styles.scene} ${choix ? styles.enPause : ""}`}>
          <svg className={styles.cercles} viewBox="0 0 700 700" aria-hidden="true">
            <circle cx="350" cy="350" r={RAYON_ADHESION} className={styles.cercleAdhesion} />
            <circle cx="350" cy="350" r={RAYON_SERVICES} className={styles.cercleServices} />
          </svg>

          <div className={styles.centre}>
            <span>
              5 €<span className={styles.parMois}>/mois</span>
            </span>
          </div>

          <div className={`${styles.anneau} ${styles.anneauAdhesion}`}>
            {PLACES_ADHESION.map(rond)}
          </div>
          <div className={`${styles.anneau} ${styles.anneauServices}`}>
            {PLACES_SERVICES.map(rond)}
          </div>

          {choix && (
            <div className={styles.fiche} role="dialog" aria-label={choix.nom}>
              <div className={styles.ficheHaut}>
                <span className={`${styles.ficheIcone} ${styles[choix.famille]}`}>
                  {ICONES[choix.icone]}
                </span>
                <div className={styles.ficheNoms}>
                  <span className={`${styles.ficheEtiquette} ${styles[choix.famille]}`}>
                    {ETIQUETTE[choix.famille]}
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
              <p className={styles.ficheTexte}>{choix.texte}</p>
            </div>
          )}
        </div>

        <p className={styles.legende}>
          <span className={styles.legendeAdhesion}>
            <i aria-hidden="true" /> L’adhésion donne accès à tout cela
          </span>
          <span className={styles.legendeServices}>
            <i aria-hidden="true" /> Les Services
          </span>
        </p>
      </div>
    </section>
  );
}
