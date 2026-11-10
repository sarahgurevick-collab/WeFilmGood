"use client";

import Link from "next/link";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ICONES } from "./AvantageAdhesion";
import { EVENEMENT_CONTACT } from "./BoutonDevis";
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
  /** Le titre du palier 0 €, quand il diffère de celui de l'adhésion. */
  nomZero?: string;
};

const GALAXIES_ZERO =
  "La Galaxie WeFilmGood (accès limité pour les videopitchs et les Talents)";

// Les phrases sont celles de Sarah (06/10), au « tu » : « le tu rapproche, le
// vous met de la distance ». Un retour à la ligne (\n) fait un paragraphe.
const ADHESION: Noeud[] = [
  {
    id: "galaxies",
    nom: "Crédit Gravity",
    nomZero: "Les Galaxies Projets - Personnages - Talents",
    icone: "gravity",
    texte:
      "Chaque jour tu as un nouveau Gravity (crédit) pour trouver le projet de ton choix dans la Galaxie de projets. Tu pourras écouter l’auteur raconter son histoire (StoryPitch), un comédien qui donne vie aux personnages (ComedyPitch) ou un compositeur qui propose le thème ou on l’espère une chanson phare qui déclenchera la production du film (MusicPitch)\nEnregistre le projet dans tes favoris et contacte les Talents le moment venu.",
    aZero: "reste",
    texteZero: GALAXIES_ZERO,
  },
  {
    id: "cinecrush",
    nom: "CinéCrush",
    icone: "coeur",
    texte:
      "Le chrono est lancé ! Ce videopitch mérite toute ton attention : tu as une semaine pour le découvrir. Laisse un avis en commentaires : ce sont de véritables tremplins magiques pour propulser les histoires !",
    aZero: "reste",
  },
  {
    id: "cinematch",
    nom: "CinéMatch",
    icone: "cercles",
    texte:
      "Découvre chaque jour qui sera le talent qui vibre sur la même longueur d’onde que toi grâce à un portrait chinois en 20 questions. Contacte-le si tu le souhaites.",
    texteZero:
      "Chaque jour un nouveau talent vibre sur la même longueur d’onde que toi grâce à un portrait chinois en 20 questions. Le contact coûte 1 Gravity.",
    aZero: "payant",
  },
  {
    id: "fiche-projet",
    nom: "Fiches Projets",
    icone: "fiche",
    texte:
      "Ne laisse aucun scénario dans ton tiroir : tes projets en développement, même anciens, sont la vitrine et la richesse de ton univers qui attise la curiosité des producteurs, inspire les comédiens (ComedyPitch) et les compositeurs (MusicPitch). Tu peux ajouter un StoryPitch pour chacun de tes projets.",
    aZero: "payant",
  },
  {
    id: "fiche-personnage",
    nom: "Fiches Personnages",
    icone: "identite",
    texte:
      "Donne vie à tes personnages avec une biographie si vibrante qu’un comédien n’aura qu’une envie… s’en emparer face caméra ! Ajoute la photo d’un inconnu ou d’une personne célèbre. Reçois une notification dès qu’un ComedyPitch est associé à ton personnage et échange avec le comédien.",
    // Créer une fiche personnage suppose une fiche projet, qui n'est jamais
    // gratuite : à 0 €, on voit les personnages, on n'en crée pas (Sarah, 05/10).
    aZero: "payant",
  },
  {
    id: "scenariolab-spectateur",
    nom: "ScénarioLab (spectateur)",
    icone: "oeil",
    texte:
      "Glisse-toi dans les coulisses de la création : viens voir 5 auteurs de talent réécrire leurs histoires en direct et participe à l’évolution de leurs scénarios ! Accès prioritaire pour les adhérents (50 places maximum)",
    texteZero:
      "Glisse-toi dans les coulisses de la création : viens voir 5 auteurs de talent réécrire leurs histoires en direct et participe à l’évolution de leurs scénarios ! 5 € (accès non prioritaire)",
    aZero: "payant",
  },
];

const SERVICES: Noeud[] = [
  {
    id: "scenariolab-participant",
    nom: "ScénarioLab (participant)",
    icone: "fiole",
    texte:
      "« Propulse ton projet au niveau supérieur : challenge ton script en direct avec 4 scénaristes et un Script Doctor qui auront analysé ton projet. Teste instantanément tes idées face au public ! » Un lien privé te permettra de revoir la séance de travail et de reprendre ton projet sur de meilleures bases. Auteur participant : 100 € — durée de l’atelier : 4 h.",
  },
  {
    id: "analyse",
    nom: "Analyse du projet",
    icone: "nuage",
    texte:
      "50 € : 1 analyse de document PDF, qui permet d’accéder à la Labellisation du projet.",
  },
  {
    id: "accompagnement",
    nom: "Accompagnement Longue Durée",
    icone: "telephone",
    texte: "500 € : accompagnement longue durée sur un projet.",
  },
  {
    id: "credits-galaxie",
    nom: "Crédits Gravity",
    icone: "gravity",
    texte:
      "Profitez de 25 Gravity au lieu de 20 (soit 15 € de cadeaux) pour booster vos histoires et déclencher vos premiers coups de cœur.",
  },
];

type Rond = Noeud & { origine: Cercle };

const RONDS: Rond[] = [
  ...ADHESION.map((n) => ({ ...n, origine: "adhesion" as const })),
  ...SERVICES.map((n) => ({ ...n, origine: "service" as const })),
];

const RAYON: Record<Cercle, number> = {
  adhesion: RAYON_ADHESION,
  service: RAYON_SERVICES,
};

/** Le titre d'un rond, selon la position du soleil. */
function titre(n: Noeud, mode: Mode): string {
  return mode === "zero" && n.nomZero ? n.nomZero : n.nom;
}

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

const PLACES_ADHESION = ADHESION.map(
  (_, i) => DEPART_ADHESION + (i * 2 * Math.PI) / ADHESION.length,
);
const PLACES_SERVICES = SERVICES.map(
  (_, j) => DEPART_SERVICES + (j * 2 * Math.PI) / SERVICES.length,
);

const INDICES = RONDS.map((_, i) => i);
const RESTES = INDICES.filter(
  (i) => RONDS[i].origine === "adhesion" && RONDS[i].aZero !== "payant",
);
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
    const places = repartir(
      indices.map((i) => etats[i].angle),
      libres,
    );
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
  const prises = DES_SERVICES.map((_, j) =>
    Math.round((j * total) / DES_SERVICES.length),
  );
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

type Etat = {
  cercle: Cercle;
  angle: number;
  rayon: number;
  cibleAngle: number;
  cibleRayon: number;
};

const ICONE_TUTORIEL = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const ICONE_MIRA = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

type LigneRecap = {
  nom: string;
  precision?: string;
  non: string;
  nonNote?: string;
  oui: string;
  ouiNote?: string;
};

// Le récapitulatif du pricing, avec les mots de Sarah (10/11).
const RECAP: LigneRecap[] = [
  {
    nom: "Crédits Gravity quotidiens",
    non: "0 crédit / jour",
    oui: "1 crédit / jour",
  },
  {
    nom: "CinéMatch",
    precision: "contacts",
    non: "Non visibles",
    oui: "visibles",
  },
  { nom: "Fiches Projets", non: "0", oui: "infini" },
  {
    nom: "Fiches Personnages",
    precision: "contacts",
    non: "Non visibles",
    oui: "visibles",
  },
  {
    nom: "ScénarioLab",
    precision: "Spectateur",
    non: "5 € (si place libre)",
    oui: "Accès prioritaire",
  },
  { nom: "CinéCrush", non: "Inclus", oui: "Inclus" },
  {
    nom: "Galaxie de Projets",
    precision: "Accès limité",
    non: "Inclus",
    oui: "Inclus",
  },
];

// La grille dégressive des adhérents (04/10) ; les non-adhérents paient 5 € le crédit (décision du 10/11).
const GRILLE_CREDITS: { nombre: number; prix: number }[] = [
  { nombre: 1, prix: 5 },
  { nombre: 5, prix: 22 },
  { nombre: 10, prix: 40 },
  { nombre: 20, prix: 70 },
];

// Les services au même prix pour tous, adhérent ou non (10/11, mots de Sarah).
const PRIX_COMMUNS: { nom: string; precision?: string; prix: string }[] = [
  { nom: "Analyse du projet", prix: "50 €" },
  { nom: "Accompagnement personnalisé", prix: "500 €" },
  { nom: "ScénarioLab", precision: "participant", prix: "100 € / personne" },
];

const ETIQUETTE: Record<Cercle, string> = {
  adhesion: "Adhésion",
  service: "Services",
};

export default function OrbiteAdhesion({
  motsCles = 0,
}: {
  motsCles?: number;
}) {
  const [mode, setMode] = useState<Mode>("adhesion");
  const [choix, setChoix] = useState<Rond | null>(null);
  const [nombreCredits, setNombreCredits] = useState(20);
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
    const minuteur = setInterval(
      () => setVedette((v) => (v + 1) % RONDS.length),
      CADENCE_BULLE_MS,
    );
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
    const immobile = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
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
        if (element)
          element.style.transform = deplacement(
            e.rayon,
            tours.current[e.cercle] + e.angle,
          );
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

  const note =
    motsCles > 0 ? `${motsCles.toLocaleString("fr-FR")} thèmes` : undefined;
  const lignes: LigneRecap[] = RECAP.flatMap((l) =>
    l.nom === "CinéCrush"
      ? [
          {
            nom: "Le Finder",
            precision: "recherche et nuage de mots-clés",
            non: "Inclus",
            nonNote: note,
            oui: "Inclus",
            ouiNote: note,
          },
          l,
        ]
      : [l],
  );
  const prixAdherent =
    GRILLE_CREDITS.find((g) => g.nombre === nombreCredits)?.prix ?? 0;

  const couleurChoix = choix ? cercleDe(choix, mode) : "adhesion";

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
          <svg
            className={styles.cercles}
            viewBox="0 0 700 700"
            aria-hidden="true"
          >
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
                  aria-label={titre(n, mode)}
                >
                  {ICONES[n.icone]}
                </button>
                <span
                  className={`${styles.nom} ${enVedette === n.id ? styles.enVedette : ""}`}
                  aria-hidden="true"
                >
                  {titre(n, mode)}
                </span>
              </div>
            );
          })}

          {choix && (
            <div
              className={styles.fiche}
              role="dialog"
              aria-label={titre(choix, mode)}
            >
              <div className={styles.ficheHaut}>
                <span
                  className={`${styles.ficheIcone} ${styles[couleurChoix]}`}
                >
                  {ICONES[choix.icone]}
                </span>
                <div className={styles.ficheNoms}>
                  <span
                    className={`${styles.ficheEtiquette} ${styles[couleurChoix]}`}
                  >
                    {ETIQUETTE[couleurChoix]}
                  </span>
                  <span className={styles.ficheNom}>{titre(choix, mode)}</span>
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
              <div className={styles.ficheTexte}>
                {(mode === "zero" && choix.texteZero
                  ? choix.texteZero
                  : choix.texte
                )
                  .split("\n")
                  .map((ligne, i) => (
                    <p key={i}>{ligne}</p>
                  ))}
              </div>
              <div className={styles.actions}>
                <Link href={`/tutoriels#${choix.id}`} className={styles.action}>
                  {ICONE_TUTORIEL}
                  Tutoriel
                </Link>
                <button
                  type="button"
                  className={styles.action}
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent(EVENEMENT_CONTACT, {
                        detail: {
                          message: `À propos de « ${titre(choix, mode)} » : `,
                        },
                      }),
                    )
                  }
                >
                  {ICONE_MIRA}
                  Poser une question à Mira
                </button>
              </div>
            </div>
          )}
        </div>

        <p className={styles.legende}>
          <span className={styles.legendeAdhesion}>
            <i aria-hidden="true" /> L’adhésion en rouge à 5 €/mois inclut de
            nombreux services
          </span>
          <span className={styles.legendeServices}>
            <i aria-hidden="true" /> L’adhésion en bleu à 0 €/mois n’a que des
            services optionnels payants
          </span>
        </p>

        <div className={styles.recap}>
          <h2 className={styles.recapTitre}>Récapitulatif du pricing</h2>
          <table className={styles.recapTable}>
            <thead>
              <tr>
                <th scope="col" aria-label="Fonctionnalités et avantages" />
                <th scope="col" className={styles.recapServices}>
                  <i aria-hidden="true" /> Non-adhérent
                  <small>0 €</small>
                </th>
                <th scope="col" className={styles.recapAdhesion}>
                  <i aria-hidden="true" /> Adhérent
                  <small>5 €/mois</small>
                </th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, index) => (
                <Fragment key={l.nom}>
                  <tr>
                    <th scope="row">
                      {l.nom}
                      {l.precision && <em> ({l.precision})</em>}
                    </th>
                    <td>
                      {l.non}
                      {l.nonNote && <small>{l.nonNote}</small>}
                    </td>
                    <td>
                      <strong>{l.oui}</strong>
                      {l.ouiNote && <small>{l.ouiNote}</small>}
                    </td>
                  </tr>
                  {index === 0 && (
                    <tr>
                      <th scope="row">
                        <label htmlFor="recap-credits">Crédits Gravity</label>
                        <select
                          id="recap-credits"
                          className={styles.recapSelect}
                          value={nombreCredits}
                          onChange={(e) =>
                            setNombreCredits(Number(e.target.value))
                          }
                        >
                          {GRILLE_CREDITS.map((g) => (
                            <option key={g.nombre} value={g.nombre}>
                              {g.nombre} {g.nombre > 1 ? "crédits" : "crédit"}
                            </option>
                          ))}
                        </select>
                      </th>
                      <td>
                        {nombreCredits}{" "}
                        {nombreCredits > 1 ? "crédits" : "crédit"} Gravity à{" "}
                        {nombreCredits * 5} €
                      </td>
                      <td>
                        <strong>{prixAdherent} €</strong>
                        {nombreCredits > 1 && (
                          <small>
                            au lieu de {nombreCredits * 5} € ·{" "}
                            {nombreCredits * 5 - prixAdherent} € offerts
                          </small>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              <tr>
                <th scope="colgroup" colSpan={3} className={styles.recapSepare}>
                  Même prix pour tous
                </th>
              </tr>
              {PRIX_COMMUNS.map((l) => (
                <tr key={l.nom}>
                  <th scope="row">
                    {l.nom}
                    {l.precision && <em> ({l.precision})</em>}
                  </th>
                  <td colSpan={2} className={styles.recapCommun}>
                    <strong>{l.prix}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
