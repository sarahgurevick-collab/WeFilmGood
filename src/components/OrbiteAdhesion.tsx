"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
 * Le soleil a deux positions (05/10, mots de Sarah) : « 5 €/mois » et
 * « 0 € ». Il passe de l'une à l'autre tout seul, sans bouton (elle trouvait
 * le bouton dommage) ; un clic sur le soleil le fait aussi. À 0 €, les ronds réservés à l'adhésion payante passent en bleu
 * et rejoignent le cercle extérieur ; restent en rouge ceux qu'on garde quand
 * même. « S'il y a trop de choses à 0 €, on n'ira pas vers les 5 €. »
 *
 * Les ronds sont déplacés image par image (et non par une animation CSS),
 * pour pouvoir glisser d'un cercle à l'autre sans à-coup.
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
// Un tour complet, en secondes : lent, c'est le choix de Sarah.
const TOUR_ADHESION_S = 110;
const TOUR_SERVICES_S = 160;
const DEPART_ADHESION = -Math.PI / 2;
const DEPART_SERVICES = -Math.PI / 6;
// Le temps que met un rond à rejoindre sa nouvelle place.
const INERTIE_S = 0.45;
// Le soleil change tout seul de position : le temps passé sur chacune.
const DUREE_ADHESION_MS = 6000;
const DUREE_ZERO_MS = 4000;

type Cercle = "adhesion" | "service";
type Mode = "adhesion" | "zero";

type Noeud = {
  id: string;
  nom: string;
  icone: keyof typeof ICONES;
  texte: string;
  /** À 0 € : le rond reste en rouge, ou passe en bleu sur le cercle extérieur. */
  aZero?: "reste" | "payant";
  /** La phrase du palier 0 €, quand elle diffère de celle de l'adhésion. */
  texteZero?: string;
};

const GALAXIES =
  "La Galaxie WeFilmGood : 1 crédit par jour pour l’une des 3 galaxies — Projets, Talents, Personnages";
const GALAXIES_ZERO = "La Galaxie WeFilmGood (accès limité pour les videopitchs et les Talents)";

const ADHESION: Noeud[] = [
  {
    id: "galaxie-projet",
    nom: "La Galaxie Projets",
    icone: "projets",
    texte:
      "Votre abonnement vous ouvre les portes d’un nouvel univers par jour. Visionnez le vidéopitch, lisez la fiche et découvrez les personnages ! Vous aurez peut-être la surprise de découvrir une vidéo d’interprétation faite par un comédien ou une comédienne. Enregistrez le projet dans vos favoris pour le retrouver en un clic et contacter l’auteur le moment venu.",
    aZero: "payant",
  },
  { id: "galaxie-talent", nom: "La Galaxie Talents", icone: "talents", texte: GALAXIES, aZero: "payant" },
  {
    id: "galaxie-personnage",
    nom: "La Galaxie Personnages",
    icone: "personnages",
    texte: GALAXIES,
    aZero: "reste",
    texteZero: GALAXIES_ZERO,
  },
  {
    id: "cinecrush",
    nom: "CinéCrush",
    icone: "coeur",
    texte:
      "Le chrono est lancé ! Ce projet mérite toute votre attention : vous avez une semaine pour découvrir son vidéopitch. Laissez vos avis en commentaires : vos retours sont un véritable tremplin magique pour propulser son histoire !",
    aZero: "reste",
  },
  {
    id: "cinematch",
    nom: "CinéMatch",
    icone: "popcorn",
    texte:
      "CinéMatch : découvrez les talents qui vibrent sur la même longueur d’onde que vous en 20 questions.",
    aZero: "payant",
  },
  {
    id: "fiche-projet",
    nom: "Fiche projet",
    icone: "fiche",
    texte:
      "Ne laissez aucun scénario dans un tiroir : vos projets en développement, même anciens, sont la vitrine et la richesse de votre univers.",
    aZero: "payant",
  },
  {
    id: "fiche-personnage",
    nom: "Fiche personnage",
    icone: "fiche",
    texte:
      "« Auteurs, donnez vie à vos personnages : donnez-leur un visage et une biographie si vibrante qu’un comédien n’aura qu’une envie… s’en emparer face caméra ! » Vous recevrez une notification et vous pourrez échanger avec le (la) comédien(ne) qui aura incarné votre personnage.",
    // Créer une fiche personnage suppose une fiche projet, qui n'est jamais
    // gratuite : à 0 €, on voit les personnages, on n'en crée pas (Sarah, 05/10).
    aZero: "payant",
  },
  {
    id: "scenariolab-spectateur",
    nom: "ScénarioLab (spectateur)",
    icone: "fiole",
    texte:
      "Glisse-toi dans les coulisses de la création : viens voir 5 auteurs de talent réécrire leurs histoires en direct et participe à l’évolution de leurs scénarios !",
    aZero: "payant",
  },
];

const SERVICES: Noeud[] = [
  {
    id: "scenariolab-participant",
    nom: "ScénarioLab (participant)",
    icone: "fiole",
    texte:
      "« Propulse ton projet au niveau supérieur : challenge ton script en direct avec 4 scénaristes et un Script Doctor qui auront analysé ton projet. Teste instantanément tes idées face au public ! » Un lien privé te permettra de revoir la séance de travail et de reprendre ton projet sur de meilleures bases.",
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

type Rond = Noeud & { origine: Cercle };

const RONDS: Rond[] = [
  ...ADHESION.map((n) => ({ ...n, origine: "adhesion" as const })),
  ...SERVICES.map((n) => ({ ...n, origine: "service" as const })),
];

const RAYON: Record<Cercle, number> = { adhesion: RAYON_ADHESION, service: RAYON_SERVICES };

/** Le cercle où se trouve un rond, selon la position du soleil. */
function cercleDe(n: Rond, mode: Mode): Cercle {
  return mode === "zero" && n.aZero === "payant" ? "service" : n.origine;
}

/** L'écart entre deux angles, ramené entre -π et π : le chemin le plus court. */
function ecart(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * Répartit des ronds sur des places libres en les faisant voyager le moins
 * possible, pour qu'ils ne se croisent pas en chemin. Au plus cinq ronds :
 * toutes les répartitions sont essayées.
 */
function repartir(angles: number[], libres: number[]): number[] {
  let meilleure: number[] = [];
  let moindre = Infinity;
  const prise = libres.map(() => false);
  const essai: number[] = [];
  const essayer = (i: number, cout: number) => {
    if (cout >= moindre) return;
    if (i === angles.length) {
      moindre = cout;
      meilleure = [...essai];
      return;
    }
    libres.forEach((libre, k) => {
      if (prise[k]) return;
      prise[k] = true;
      essai[i] = libre;
      essayer(i + 1, cout + ecart(libre - angles[i]) ** 2);
      prise[k] = false;
    });
  };
  essayer(0, 0);
  return meilleure;
}

const PLACES_ADHESION = ADHESION.map((_, i) => DEPART_ADHESION + (i * 2 * Math.PI) / ADHESION.length);
const PLACES_SERVICES = SERVICES.map((_, j) => DEPART_SERVICES + (j * 2 * Math.PI) / SERVICES.length);

const INDICES = RONDS.map((_, i) => i);
const RESTES = INDICES.filter((i) => RONDS[i].origine === "adhesion" && RONDS[i].aZero !== "payant");
const PAYANTS = INDICES.filter((i) => RONDS[i].aZero === "payant");
const DES_SERVICES = INDICES.filter((i) => RONDS[i].origine === "service");

/**
 * Donne à chaque rond sa nouvelle place. L'ordre sur un cercle n'a pas de
 * sens : un rond qui change de cercle prend la place libre la plus proche
 * de l'endroit où il se trouve au moment de la bascule.
 */
function replacer(etats: Etat[], tours: Record<Cercle, number>, mode: Mode) {
  RONDS.forEach((n, i) => {
    const e = etats[i];
    const cercle = cercleDe(n, mode);
    if (cercle !== e.cercle) {
      // Même endroit de la scène, exprimé sur le nouveau cercle.
      e.angle = tours[e.cercle] + e.angle - tours[cercle];
      e.cercle = cercle;
    }
    e.cibleRayon = RAYON[cercle];
  });
  const poser = (indices: number[], libres: number[]) => {
    const places = repartir(indices.map((i) => etats[i].angle), libres);
    indices.forEach((i, k) => {
      etats[i].cibleAngle = places[k];
    });
    return libres.filter((libre) => !places.includes(libre));
  };

  if (mode === "adhesion") {
    DES_SERVICES.forEach((i, j) => {
      etats[i].cibleAngle = PLACES_SERVICES[j];
    });
    poser(PAYANTS, poser(RESTES, PLACES_ADHESION));
    return;
  }
  // À 0 € : le cercle payant accueille les services et les ronds devenus
  // payants ; ceux qui restent se répartissent sur le premier cercle.
  const total = DES_SERVICES.length + PAYANTS.length;
  const pas = (2 * Math.PI) / total;
  const prises = DES_SERVICES.map((_, j) => Math.round((j * total) / DES_SERVICES.length));
  DES_SERVICES.forEach((i, j) => {
    etats[i].cibleAngle = DEPART_SERVICES + prises[j] * pas;
  });
  const libres: number[] = [];
  for (let c = 0; c < total; c++) {
    if (!prises.includes(c)) libres.push(DEPART_SERVICES + c * pas);
  }
  poser(PAYANTS, libres);
  RESTES.forEach((i, k) => {
    etats[i].cibleAngle = -Math.PI / 4 + (k * 2 * Math.PI) / RESTES.length;
  });
}

function deplacement(rayon: number, angle: number): string {
  const x = ((rayon * Math.cos(angle)) / SCENE) * 100;
  const y = ((rayon * Math.sin(angle)) / SCENE) * 100;
  return `translate(${x.toFixed(3)}cqw, ${y.toFixed(3)}cqw)`;
}

const PLACES_DEPART = [...PLACES_ADHESION, ...PLACES_SERVICES];

// La place de départ, écrite dans la page : elle sert avant que l'orbite
// ne se mette en mouvement. Elle ne change jamais, pour que React ne
// vienne pas corriger ce que l'animation a déplacé.
const STYLE_DEPART: CSSProperties[] = RONDS.map((n, i) => ({
  ["--taille" as string]: `${((n.origine === "adhesion" ? TAILLE_ADHESION : TAILLE_SERVICE) / SCENE) * 100}%`,
  transform: deplacement(RAYON[n.origine], PLACES_DEPART[i]),
}));

type Etat = { cercle: Cercle; angle: number; rayon: number; cibleAngle: number; cibleRayon: number };

const ETIQUETTE: Record<Cercle, string> = { adhesion: "Adhésion", service: "Services" };

export default function OrbiteAdhesion() {
  const [mode, setMode] = useState<Mode>("adhesion");
  const [choix, setChoix] = useState<Rond | null>(null);
  const [vedette, setVedette] = useState(0);
  const enVedette = choix ? null : RONDS[vedette].id;

  const elements = useRef<(HTMLDivElement | null)[]>([]);
  // L'angle de chaque cercle, et pour chaque rond sa place sur le sien.
  const tours = useRef<Record<Cercle, number>>({ adhesion: 0, service: 0 });
  const etats = useRef<Etat[]>(
    RONDS.map((n, i) => ({
      cercle: n.origine,
      angle: PLACES_DEPART[i],
      rayon: RAYON[n.origine],
      cibleAngle: PLACES_DEPART[i],
      cibleRayon: RAYON[n.origine],
    })),
  );
  const survol = useRef(false);
  const arret = useRef(false);

  useEffect(() => {
    arret.current = choix !== null;
  }, [choix]);

  // Sur téléphone, les noms ne tiennent pas tous : chaque rond se présente
  // à tour de rôle, comme sur l'accueil.
  useEffect(() => {
    if (choix) return;
    const minuteur = setInterval(() => setVedette((v) => (v + 1) % RONDS.length), CADENCE_BULLE_MS);
    return () => clearInterval(minuteur);
  }, [choix]);

  // Le soleil passe tout seul d'une position à l'autre. Il attend tant que
  // la souris est sur l'orbite ou qu'une explication est ouverte.
  useEffect(() => {
    if (choix) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const duree = mode === "zero" ? DUREE_ZERO_MS : DUREE_ADHESION_MS;
    let ecoule = 0;
    const minuteur = setInterval(() => {
      if (survol.current) return;
      ecoule += 500;
      if (ecoule >= duree) setMode((m) => (m === "zero" ? "adhesion" : "zero"));
    }, 500);
    return () => clearInterval(minuteur);
  }, [mode, choix]);

  // La bascule : chaque rond reçoit sa nouvelle place, et y glisse.
  useEffect(() => {
    replacer(etats.current, tours.current, mode);
  }, [mode]);

  useEffect(() => {
    const immobile = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const vitesseAdhesion = immobile ? 0 : (2 * Math.PI) / TOUR_ADHESION_S;
    const vitesseServices = immobile ? 0 : (2 * Math.PI) / TOUR_SERVICES_S;
    let image = 0;
    let avant = performance.now();

    const avancer = (maintenant: number) => {
      const dt = Math.min((maintenant - avant) / 1000, 0.1);
      avant = maintenant;
      if (!survol.current && !arret.current) {
        tours.current.adhesion += vitesseAdhesion * dt;
        tours.current.service -= vitesseServices * dt;
      }
      const part = immobile ? 1 : 1 - Math.exp(-dt / INERTIE_S);
      etats.current.forEach((e, i) => {
        e.angle += ecart(e.cibleAngle - e.angle) * part;
        e.rayon += (e.cibleRayon - e.rayon) * part;
        const element = elements.current[i];
        if (element) element.style.transform = deplacement(e.rayon, tours.current[e.cercle] + e.angle);
      });
      image = requestAnimationFrame(avancer);
    };

    image = requestAnimationFrame(avancer);
    return () => cancelAnimationFrame(image);
  }, []);

  const basculer = (vers: Mode) => {
    setChoix(null);
    setMode(vers);
  };

  const couleurChoix = choix ? cercleDe(choix, mode) : "adhesion";
  const devenuPayant = choix !== null && choix.origine === "adhesion" && couleurChoix === "service";

  return (
    <section className={styles.orbite}>
      <div className={styles.cadreScene}>
        <div
          className={styles.scene}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") survol.current = true;
          }}
          onPointerLeave={() => {
            survol.current = false;
          }}
        >
          <svg className={styles.cercles} viewBox="0 0 700 700" aria-hidden="true">
            <circle cx="350" cy="350" r={RAYON_ADHESION} />
            <circle cx="350" cy="350" r={RAYON_SERVICES} />
          </svg>

          <button
            type="button"
            className={styles.centre}
            onClick={() => basculer(mode === "zero" ? "adhesion" : "zero")}
          >
            {mode === "zero" ? (
              <span key="zero" className={styles.prix}>
                0 €
              </span>
            ) : (
              <span key="adhesion" className={styles.prix}>
                5 €<span className={styles.parMois}>/mois</span>
              </span>
            )}
          </button>

          {RONDS.map((n, i) => {
            const couleur = cercleDe(n, mode);
            return (
              <div
                key={n.id}
                ref={(element) => {
                  elements.current[i] = element;
                }}
                className={styles.place}
                style={STYLE_DEPART[i]}
              >
                <button
                  type="button"
                  className={`${styles.noeud} ${styles[couleur]} ${choix?.id === n.id ? styles.choisi : ""}`}
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
            );
          })}

          {choix && (
            <div className={styles.fiche} role="dialog" aria-label={choix.nom}>
              <div className={styles.ficheHaut}>
                <span className={`${styles.ficheIcone} ${styles[couleurChoix]}`}>
                  {ICONES[choix.icone]}
                </span>
                <div className={styles.ficheNoms}>
                  <span className={`${styles.ficheEtiquette} ${styles[couleurChoix]}`}>
                    {devenuPayant ? "Adhésion · 5 €/mois" : ETIQUETTE[couleurChoix]}
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
              <p className={styles.ficheTexte}>
                {mode === "zero" && choix.texteZero ? choix.texteZero : choix.texte}
              </p>
            </div>
          )}
        </div>

        <p className={styles.legende}>
          <span className={styles.legendeAdhesion}>
            <i aria-hidden="true" /> L’adhésion en rouge à 5 €/mois inclut de nombreux services
          </span>
          <span className={styles.legendeServices}>
            <i aria-hidden="true" /> L’adhésion en bleu à 0 €/mois n’a que des services optionnels payants
          </span>
        </p>
      </div>
    </section>
  );
}
