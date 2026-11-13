"use client";

import createGlobe from "cobe";
import { useEffect, useRef, useState } from "react";
import { POSITIONS_PAYS } from "@/data/positionsPays";
import styles from "./GlobePays.module.css";

/**
 * Le globe Terre des pays (essai du 13/11/2026, Sarah, d'après « cobe globe »
 * de 21st.dev) : une Terre en points qui tourne, un point rouge par pays à sa
 * vraie place, plus gros quand le pays compte plus de talents. Le globe
 * tourne tout seul jusqu'à un pays parmi les mieux représentés, sa carte sort
 * (drapeau, nom, nombre de talents), puis il part vers le suivant. On peut le
 * faire tourner à la main. Globe d'avant : étiquette git
 * « accueil-avant-globe-terre ».
 */
export type PaysDuGlobe = { code: string; nom: string; n: number };

const ROUGE: [number, number, number] = [0.855, 0.173, 0.145];
const SOMBRE: [number, number, number] = [0.1, 0.1, 0.1];
const TOUR = 2 * Math.PI;
// Le temps laissé au globe pour tourner jusqu'au pays, puis celui de la carte.
const TRAJET = 1500;

/** L'angle du globe qui met ce point de la Terre face à nous. */
function anglesDe([lat, lng]: [number, number]): [number, number] {
  return [Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180];
}

export default function GlobePays({
  pays,
  vedettes,
  dureeVedette = 2800,
}: {
  pays: PaysDuGlobe[];
  /** Les codes des pays qui sortent en exemple. */
  vedettes: string[];
  dureeVedette?: number;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);
  const [pret, setPret] = useState(false);
  // Le pays dont la carte est sortie.
  const [vedette, setVedette] = useState<PaysDuGlobe | null>(null);

  useEffect(() => {
    const canvas = toile.current;
    const zone = scene.current;
    if (!canvas || !zone) return;
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const places = pays.filter((p) => POSITIONS_PAYS[p.code]);
    const max = Math.max(1, ...places.map((p) => p.n));
    const marqueurs = (enAvant: string | null) =>
      places.map((p) => ({
        location: POSITIONS_PAYS[p.code],
        // Du plus petit point au plus gros, sans que la France écrase tout.
        size: (enAvant === p.code ? 0.03 : 0) + 0.018 + 0.05 * (Math.log(1 + p.n) / Math.log(1 + max)),
        color: enAvant === p.code ? SOMBRE : ROUGE,
      }));
    const candidats = places.filter((p) => vedettes.includes(p.code));

    // Au départ : la France face à nous.
    let [phi, theta] = anglesDe(POSITIONS_PAYS.FR ?? [46, 2]);
    let cible: [number, number] | null = null;
    let tire: { x: number; y: number; phi: number; theta: number } | null = null;
    let visible = true;
    let image = 0;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    let dernier: string | null = null;
    let globe: ReturnType<typeof createGlobe> | null = null;

    const suivant = () => {
      clearTimeout(minuterie);
      setVedette(null);
      globe?.update({ markers: marqueurs(null) });
      if (calme || candidats.length === 0) return;
      if (!visible || tire) {
        minuterie = setTimeout(suivant, 800);
        return;
      }
      let p = candidats[Math.floor(Math.random() * candidats.length)];
      if (p.code === dernier && candidats.length > 1) {
        p = candidats[(candidats.indexOf(p) + 1) % candidats.length];
      }
      dernier = p.code;
      cible = anglesDe(POSITIONS_PAYS[p.code]);
      globe?.update({ markers: marqueurs(p.code) });
      minuterie = setTimeout(() => {
        if (tire) return suivant();
        setVedette(p);
        minuterie = setTimeout(suivant, dureeVedette);
      }, TRAJET);
    };

    const dessiner = () => {
      if (cible && !tire) {
        // Par le plus court chemin autour du globe.
        let ecart = (cible[0] - phi) % TOUR;
        if (ecart > Math.PI) ecart -= TOUR;
        if (ecart < -Math.PI) ecart += TOUR;
        phi += ecart * 0.07;
        theta += (cible[1] - theta) * 0.07;
      }
      globe?.update({ phi, theta });
      if (visible) image = requestAnimationFrame(dessiner);
    };

    const creer = () => {
      const largeur = canvas.offsetWidth;
      if (largeur === 0 || globe) return;
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: largeur,
        height: largeur,
        phi,
        theta,
        dark: 0,
        diffuse: 1.5,
        mapSamples: 16000,
        mapBrightness: 10,
        baseColor: [1, 1, 1],
        markerColor: ROUGE,
        glowColor: [0.94, 0.93, 0.91],
        markerElevation: 0.02,
        markers: marqueurs(null),
      });
      setPret(true);
      image = requestAnimationFrame(dessiner);
      minuterie = setTimeout(suivant, 1200);
    };

    const taille = new ResizeObserver(() => creer());
    taille.observe(canvas);

    // Hors de l'écran : tout s'arrête.
    const veille = new IntersectionObserver(([e]) => {
      const avant = visible;
      visible = e.isIntersecting;
      if (visible && !avant && globe) image = requestAnimationFrame(dessiner);
    });
    veille.observe(zone);

    const appui = (e: PointerEvent) => {
      tire = { x: e.clientX, y: e.clientY, phi, theta };
      cible = null;
      setVedette(null);
    };
    const glisse = (e: PointerEvent) => {
      if (!tire) return;
      phi = tire.phi + (e.clientX - tire.x) / 200;
      theta = Math.max(-1.2, Math.min(1.2, tire.theta + (e.clientY - tire.y) / 300));
    };
    const lache = () => {
      if (!tire) return;
      tire = null;
      clearTimeout(minuterie);
      minuterie = setTimeout(suivant, 2500);
    };
    canvas.addEventListener("pointerdown", appui);
    window.addEventListener("pointermove", glisse, { passive: true });
    window.addEventListener("pointerup", lache, { passive: true });

    return () => {
      clearTimeout(minuterie);
      cancelAnimationFrame(image);
      taille.disconnect();
      veille.disconnect();
      canvas.removeEventListener("pointerdown", appui);
      window.removeEventListener("pointermove", glisse);
      window.removeEventListener("pointerup", lache);
      globe?.destroy();
    };
  }, [pays, vedettes, dureeVedette]);

  return (
    <div ref={scene} className={styles.scene}>
      <canvas ref={toile} className={`${styles.toile} ${pret ? styles.pret : ""}`} aria-hidden="true" />
      {vedette && (
        <>
          <span className={styles.repere} aria-hidden="true" />
          <div key={vedette.code} className={styles.carte}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.drapeau} src={`/drapeaux/${vedette.code.toLowerCase()}.svg`} alt="" />
            <p className={styles.nom}>{vedette.nom}</p>
            <p className={styles.nombre}>
              {vedette.n.toLocaleString("fr-FR")} talent{vedette.n > 1 ? "s" : ""}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
