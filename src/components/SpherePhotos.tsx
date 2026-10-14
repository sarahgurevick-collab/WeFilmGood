"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import placeholders from "@/styles/placeholders.module.css";
import styles from "./SpherePhotos.module.css";

const PLACEHOLDERS = [
  placeholders.ph0,
  placeholders.ph1,
  placeholders.ph2,
  placeholders.ph3,
  placeholders.ph4,
  placeholders.ph5,
];

export type PhotoSphereItem = {
  id: string;
  src?: string | null;
  alt: string;
  titre?: string;
  description?: string;
};

/**
 * La sphère de photos des témoignages, réécrite le 14/10/2026 à partir de
 * « Img Sphere » de Tony Sebastian (21st.dev), le modèle que Sarah avait en
 * tête : sans Tailwind, aux couleurs du site, avec les vrais témoignages.
 *
 * Ce qui fait son allure : les photos de devant sont grandes, celles de
 * derrière petites et transparentes, puis plus dessinées du tout ; un bord
 * blanc fin et une ombre légère ; on fait tourner la sphère à la souris ou
 * au doigt, elle garde son élan, et tourne seule doucement ; un clic sur une
 * photo ouvre le témoignage dans une fenêtre.
 *
 * Elle ne tourne que lorsqu'elle est à l'écran (la page Témoignages pesait
 * lourd, remarque de Sarah le 14/10).
 */

type PositionSphere = { theta: number; phi: number };
type PositionEcran = {
  x: number;
  y: number;
  z: number;
  echelle: number;
  profondeur: number;
  visible: boolean;
  opacite: number;
};

const deg = (d: number) => d * (Math.PI / 180);
const normaliser = (angle: number) => {
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
};

/** Répartit `n` points sur la sphère (suite de Fibonacci), comme le modèle :
 *  les pôles sont un peu garnis, et un léger aléa évite les motifs réguliers. */
function positionsSphere(n: number): PositionSphere[] {
  const positions: PositionSphere[] = [];
  const nombreOr = (1 + Math.sqrt(5)) / 2;
  const pas = (2 * Math.PI) / nombreOr;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    let phi = Math.acos(1 - 2 * t) * (180 / Math.PI);
    let theta = ((pas * i * 180) / Math.PI) % 360;
    const versPole = Math.pow(Math.abs(phi - 90) / 90, 0.6) * 35;
    phi = phi < 90 ? Math.max(5, phi - versPole) : Math.min(175, phi + versPole);
    phi = 15 + (phi / 180) * 150;
    theta = (theta + (Math.random() - 0.5) * 20) % 360;
    phi = Math.max(0, Math.min(180, phi + (Math.random() - 0.5) * 10));
    positions.push({ theta, phi });
  }
  return positions;
}

export default function SpherePhotos({
  photos,
  taille = 560,
  rayon,
  echelleImage = 0.15,
  sensibilite = 0.5,
  freinage = 0.95,
  vitesseMax = 5,
  vitesseAuto = 0.2,
}: {
  photos: PhotoSphereItem[];
  /** La taille de la scène en pixels, réduite si l'écran est plus étroit. */
  taille?: number;
  /** Le rayon de la sphère ; par défaut un peu plus du tiers de la scène. */
  rayon?: number;
  /** La taille d'une photo de face, en part de la scène. */
  echelleImage?: number;
  sensibilite?: number;
  freinage?: number;
  vitesseMax?: number;
  /** La rotation toute seule, en degrés par image. */
  vitesseAuto?: number;
}) {
  const cadre = useRef<HTMLDivElement | null>(null);
  const [largeur, setLargeur] = useState<number | null>(null);
  const [reduit, setReduit] = useState(false);
  const [aLEcran, setALEcran] = useState(true);
  const [rotation, setRotation] = useState({ x: 15, y: 15 });
  const vitesse = useRef({ x: 0, y: 0 });
  const glisse = useRef(false);
  const dernierPoint = useRef({ x: 0, y: 0 });
  const [survol, setSurvol] = useState<number | null>(null);
  const [ouvert, setOuvert] = useState<PhotoSphereItem | null>(null);

  const scene = largeur === null ? null : Math.min(taille, largeur);
  const rayonReel = scene === null ? 0 : (rayon ?? scene * 0.36);
  const tailleImage = scene === null ? 0 : scene * echelleImage;

  // Les positions sur la sphère ne sont tirées qu'une fois par nombre de
  // photos. Elles contiennent un peu d'aléa, mais la scène n'est dessinée
  // qu'après la mesure du cadre, côté navigateur : pas de désaccord avec
  // le serveur.
  const positions = useMemo(() => positionsSphere(photos.length), [photos.length]);

  // La largeur disponible, la préférence « moins d'animations », et la
  // présence à l'écran : hors écran, plus rien ne bouge.
  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const mesurer = () => setLargeur(el.clientWidth);
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduit(mq.matches);
    const surMq = (e: MediaQueryListEvent) => setReduit(e.matches);
    mq.addEventListener("change", surMq);
    const io = new IntersectionObserver(([entree]) => setALEcran(entree.isIntersecting));
    io.observe(el);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", surMq);
      io.disconnect();
    };
  }, []);

  const borner = useCallback(
    (v: number) => Math.max(-vitesseMax, Math.min(vitesseMax, v)),
    [vitesseMax],
  );

  // Le mouvement, image par image : l'élan s'éteint peu à peu, la rotation
  // automatique continue.
  useEffect(() => {
    if (reduit || !aLEcran || ouvert) return;
    let id = 0;
    const pas = () => {
      if (!glisse.current) {
        vitesse.current = { x: vitesse.current.x * freinage, y: vitesse.current.y * freinage };
        if (Math.abs(vitesse.current.x) < 0.01) vitesse.current.x = 0;
        if (Math.abs(vitesse.current.y) < 0.01) vitesse.current.y = 0;
        setRotation((r) => ({
          x: normaliser(r.x + borner(vitesse.current.x)),
          y: normaliser(r.y + vitesseAuto + borner(vitesse.current.y)),
        }));
      }
      id = requestAnimationFrame(pas);
    };
    id = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(id);
  }, [reduit, aLEcran, ouvert, freinage, vitesseAuto, borner]);

  // Glisser à la souris ou au doigt.
  const debut = (x: number, y: number) => {
    glisse.current = true;
    vitesse.current = { x: 0, y: 0 };
    dernierPoint.current = { x, y };
  };
  const mouvement = useCallback(
    (x: number, y: number) => {
      if (!glisse.current) return;
      const dx = x - dernierPoint.current.x;
      const dy = y - dernierPoint.current.y;
      const delta = { x: borner(-dy * sensibilite), y: borner(dx * sensibilite) };
      setRotation((r) => ({ x: normaliser(r.x + delta.x), y: normaliser(r.y + delta.y) }));
      vitesse.current = delta;
      dernierPoint.current = { x, y };
    },
    [borner, sensibilite],
  );
  useEffect(() => {
    const souris = (e: MouseEvent) => mouvement(e.clientX, e.clientY);
    const doigt = (e: TouchEvent) => {
      if (!glisse.current) return;
      e.preventDefault();
      mouvement(e.touches[0].clientX, e.touches[0].clientY);
    };
    const fin = () => {
      glisse.current = false;
    };
    document.addEventListener("mousemove", souris);
    document.addEventListener("mouseup", fin);
    document.addEventListener("touchmove", doigt, { passive: false });
    document.addEventListener("touchend", fin);
    return () => {
      document.removeEventListener("mousemove", souris);
      document.removeEventListener("mouseup", fin);
      document.removeEventListener("touchmove", doigt);
      document.removeEventListener("touchend", fin);
    };
  }, [mouvement]);

  // La fenêtre du témoignage se ferme avec Échap.
  useEffect(() => {
    if (!ouvert) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(null);
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [ouvert]);

  // Où chaque photo tombe à l'écran, pour la rotation du moment : taille
  // selon la profondeur et l'éloignement du centre, transparence quand elle
  // passe derrière, plus dessinée du tout au fond. Puis, comme le modèle,
  // deux photos qui se chevaucheraient sont réduites.
  const ecran = useMemo<PositionEcran[]>(() => {
    if (!positions.length || !scene) return [];
    const rx = deg(rotation.x);
    const ry = deg(rotation.y);
    const brutes = positions.map((p) => {
      const th = deg(p.theta);
      const ph = deg(p.phi);
      let x = rayonReel * Math.sin(ph) * Math.cos(th);
      let y = rayonReel * Math.cos(ph);
      let z = rayonReel * Math.sin(ph) * Math.sin(th);
      const x1 = x * Math.cos(ry) + z * Math.sin(ry);
      const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
      x = x1;
      z = z1;
      const y2 = y * Math.cos(rx) - z * Math.sin(rx);
      const z2 = y * Math.sin(rx) + z * Math.cos(rx);
      y = y2;
      z = z2;
      const debutFondu = -10;
      const finFondu = -30;
      const visible = z > finFondu;
      const opacite = z <= debutFondu ? Math.max(0, (z - finFondu) / (debutFondu - finFondu)) : 1;
      const pole = p.phi < 30 || p.phi > 150;
      const distance = Math.min(Math.sqrt(x * x + y * y) / rayonReel, 1);
      const echelleCentre = Math.max(0.3, 1 - distance * (pole ? 0.4 : 0.7));
      const profondeur = (z + rayonReel) / (2 * rayonReel);
      const echelle = echelleCentre * Math.max(0.5, 0.8 + profondeur * 0.3);
      return { x, y, z, echelle, profondeur, visible, opacite };
    });
    return brutes.map((p, i) => {
      if (!p.visible) return p;
      let echelle = p.echelle;
      const ma = tailleImage * echelle;
      for (let j = 0; j < brutes.length; j++) {
        if (i === j || !brutes[j].visible) continue;
        const autre = tailleImage * brutes[j].echelle;
        const d = Math.hypot(p.x - brutes[j].x, p.y - brutes[j].y);
        const mini = (ma + autre) / 2 + 25;
        if (d < mini && d > 0) {
          const recouvrement = mini - d;
          echelle = Math.min(echelle, echelle * Math.max(0.4, 1 - (recouvrement / mini) * 0.6));
        }
      }
      return { ...p, echelle: Math.max(0.25, echelle) };
    });
  }, [positions, rotation, scene, rayonReel, tailleImage]);

  if (reduit) {
    return (
      <div ref={cadre} className={styles.zone}>
        <div className={styles.grillePlate}>
          {photos.map((photo, i) => (
            <button key={photo.id} type="button" className={styles.bouton} onClick={() => setOuvert(photo)}>
              <Vignette photo={photo} index={i} />
            </button>
          ))}
        </div>
        <Fenetre photo={ouvert} index={photos.findIndex((p) => p.id === ouvert?.id)} fermer={() => setOuvert(null)} />
      </div>
    );
  }

  return (
    <div ref={cadre} className={styles.zone}>
      {scene !== null && (
        <div
          className={styles.scene}
          style={{ width: scene, height: scene }}
          onMouseDown={(e: ReactMouseEvent) => {
            e.preventDefault();
            debut(e.clientX, e.clientY);
          }}
          onTouchStart={(e: ReactTouchEvent) => debut(e.touches[0].clientX, e.touches[0].clientY)}
        >
          {photos.map((photo, i) => {
            const p = ecran[i];
            if (!p || !p.visible) return null;
            const dim = tailleImage * p.echelle;
            const zoom = survol === i ? Math.min(1.2, 1.2 / p.echelle) : 1;
            return (
              <button
                key={photo.id}
                type="button"
                className={styles.point}
                style={{
                  width: dim,
                  height: dim,
                  left: scene / 2 + p.x,
                  top: scene / 2 + p.y,
                  opacity: p.opacite,
                  transform: `translate(-50%, -50%) scale(${zoom})`,
                  zIndex: Math.round(1000 + p.z),
                }}
                onMouseEnter={() => setSurvol(i)}
                onMouseLeave={() => setSurvol(null)}
                onClick={() => setOuvert(photo)}
                aria-label={photo.titre ? `Lire le témoignage de ${photo.titre}` : "Lire le témoignage"}
              >
                <Vignette photo={photo} index={i} />
              </button>
            );
          })}
        </div>
      )}

      <p className={styles.legendeIndice}>
        Faites glisser la sphère, ou cliquez sur une photo pour lire le témoignage.
      </p>

      <Fenetre photo={ouvert} index={photos.findIndex((p) => p.id === ouvert?.id)} fermer={() => setOuvert(null)} />
    </div>
  );
}

function Vignette({ photo, index }: { photo: PhotoSphereItem; index: number }) {
  if (photo.src) {
    return (
      <span className={styles.vignette}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt="" draggable={false} loading={index < 12 ? "eager" : "lazy"} />
      </span>
    );
  }
  // Sans photo : un fond de couleur et l'initiale, comme ailleurs sur le site.
  return (
    <span className={`${styles.vignette} ${PLACEHOLDERS[index % PLACEHOLDERS.length]}`}>
      <span className={styles.initiale}>{photo.alt.trim().charAt(0).toUpperCase()}</span>
    </span>
  );
}

/** Le témoignage, dans une fenêtre par-dessus la page : la photo, le nom, le texte. */
function Fenetre({ photo, index, fermer }: { photo: PhotoSphereItem | null; index: number; fermer: () => void }) {
  if (!photo) return null;
  return (
    <div className={styles.voile} onClick={fermer} role="presentation">
      <div className={styles.fenetre} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.fenetrePhoto}>
          <Vignette photo={photo} index={Math.max(0, index)} />
          <button type="button" className={styles.fermer} onClick={fermer} aria-label="Fermer">
            ×
          </button>
        </div>
        <div className={styles.fenetreTexte}>
          {photo.titre && <p className={styles.legendeTitre}>{photo.titre}</p>}
          {photo.description && (
            <p className={styles.legendeTexte}>&laquo;&nbsp;{photo.description}&nbsp;&raquo;</p>
          )}
        </div>
      </div>
    </div>
  );
}
