"use client";

import createGlobe from "cobe";
import { useEffect, useRef, useState } from "react";
import { POSITIONS_PAYS } from "@/data/positionsPays";
import styles from "./GlobePays.module.css";

/**
 * Le globe Terre des pays (essai du 13/11/2026, Sarah, d'après « cobe globe »
 * de 21st.dev) : une Terre en points qui tourne lentement. Dans chaque pays,
 * un point par métier, à la couleur de ce métier sur l'anneau d'à côté, plus
 * gros quand ce métier y compte plus de talents (14/11, Sarah : « Ma fille a
 * compris qu'il n'y avait que des scénaristes sur le globe »).
 *
 * C'est la souris qui montre les pays (14/11, Sarah : « je voudrais remplacer
 * l'effet automatique par la souris, qu'on puisse pointer sur une zone ») :
 * le globe s'arrête dès que la souris est dessus ; sur un pays, sa carte
 * s'affiche (drapeau, nom, nombre de talents, métiers). Au doigt : toucher un
 * pays affiche sa carte quelques secondes. On peut toujours faire tourner le
 * globe à la main. Avant (le globe allait seul d'un pays à l'autre) :
 * étiquette git « accueil-avant-globe-a-la-souris » ; globe d'avant la Terre :
 * « accueil-avant-globe-terre ».
 */
export type PaysDuGlobe = { code: string; nom: string; n: number; metiers?: Record<string, number> };
/** Un métier de l'anneau et sa couleur (« #da2c25 »). */
export type FamilleDuGlobe = { slug: string; label: string; couleur: string };

type Couleur = [number, number, number];
const ROUGE: Couleur = [0.855, 0.173, 0.145];

function couleurDe(hex: string): Couleur {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
// La vitesse du globe quand il tourne seul : un tour en une minute environ.
const PAS = 0.0018;
// Combien de temps la carte reste après un toucher du doigt.
const DUREE_TOUCHER = 4000;

/** L'angle du globe qui met ce point de la Terre face à nous. */
function anglesDe([lat, lng]: [number, number]): [number, number] {
  return [Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180];
}

export default function GlobePays({
  pays,
  familles = [],
}: {
  pays: PaysDuGlobe[];
  /** Les métiers montrés, chacun avec sa couleur. */
  familles?: FamilleDuGlobe[];
}) {
  const scene = useRef<HTMLDivElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);
  const [pret, setPret] = useState(false);
  // Le pays sous la souris, et où poser sa carte dans la scène (dessous
  // quand la souris est en haut du globe, sinon dessus).
  const [bulle, setBulle] = useState<{ p: PaysDuGlobe; x: number; y: number; dessous: boolean } | null>(null);

  useEffect(() => {
    const canvas = toile.current;
    const zone = scene.current;
    if (!canvas || !zone) return;
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const places = pays.filter((p) => POSITIONS_PAYS[p.code]);
    const max = Math.max(1, ...places.map((p) => p.n));
    // Du plus petit point au plus gros, sans que la France écrase tout.
    const poids = (n: number) => Math.log(1 + n) / Math.log(1 + max);
    const teintes = familles.map((f) => ({ slug: f.slug, couleur: couleurDe(f.couleur) }));
    const presentsDe = (p: PaysDuGlobe) => teintes.filter((t) => (p.metiers?.[t.slug] ?? 0) > 0);
    // L'écart, en degrés, entre la place du pays et ses points rangés en rond.
    const rayonDe = (p: PaysDuGlobe, n: number) => (n <= 1 ? 0 : 1.3 + 2.4 * poids(p.n));
    const marqueurs = (enAvant: string | null) =>
      places.flatMap((p) => {
        const [lat, lng] = POSITIONS_PAYS[p.code];
        const plus = enAvant === p.code ? 0.02 : 0;
        const presents = presentsDe(p);
        // Un pays dont aucun talent n'a l'un de ces métiers garde son point rouge.
        if (presents.length === 0) {
          return [{ location: [lat, lng] as [number, number], size: plus + 0.018 + 0.05 * poids(p.n), color: ROUGE }];
        }
        // Les points d'un pays se rangent en rond autour de sa place, d'autant
        // plus écartés que le pays compte de talents.
        const rayon = rayonDe(p, presents.length) + (plus && presents.length > 1 ? 1 : 0);
        const serre = Math.max(0.3, Math.cos((lat * Math.PI) / 180));
        return presents.map((t, i) => {
          const angle = (i / presents.length) * 2 * Math.PI - Math.PI / 2;
          return {
            location: [lat - rayon * Math.sin(angle), lng + (rayon * Math.cos(angle)) / serre] as [number, number],
            size: plus + 0.014 + 0.04 * poids(p.metiers?.[t.slug] ?? 0),
            color: t.couleur,
          };
        });
      });

    // Au départ : la France face à nous.
    let [phi, theta] = anglesDe(POSITIONS_PAYS.FR ?? [46, 2]);
    let tire: { x: number; y: number; phi: number; theta: number } | null = null;
    let visible = true;
    let image = 0;
    // La souris est sur le globe : il ne tourne plus.
    let dessus = false;
    // Le pays sous la souris (ou touché du doigt).
    let survol: string | null = null;
    let finToucher: ReturnType<typeof setTimeout> | undefined;
    let globe: ReturnType<typeof createGlobe> | null = null;

    const dessiner = () => {
      if (!calme && !tire && !dessus && !survol) phi += PAS;
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

    // Le pays le plus proche de ce point de l'écran, s'il y en a un tout près.
    // (Même calcul que la bibliothèque : les points sont à 0,82 du bord de la toile.)
    const paysSous = (clientX: number, clientY: number) => {
      const cadre = canvas.getBoundingClientRect();
      const r = (cadre.width / 2) * 0.82;
      const [cp, sp, ct, st] = [Math.cos(phi), Math.sin(phi), Math.cos(theta), Math.sin(theta)];
      let trouve: PaysDuGlobe | null = null;
      let pres = Infinity;
      for (const p of places) {
        const [lat, lng] = POSITIONS_PAYS[p.code];
        const la = (lat * Math.PI) / 180;
        const lo = (lng * Math.PI) / 180 - Math.PI;
        const [x, y, z] = [-Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)];
        // Derrière le globe, ou trop sur le bord : on ne le voit pas.
        if (-sp * ct * x + st * y + cp * ct * z < 0.2) continue;
        const ex = cadre.left + cadre.width / 2 + r * (cp * x + sp * z);
        const ey = cadre.top + cadre.height / 2 - r * (sp * st * x + ct * y - cp * st * z);
        const d = Math.hypot(clientX - ex, clientY - ey);
        const marge = 14 + ((rayonDe(p, presentsDe(p).length) * Math.PI) / 180) * r;
        if (d <= marge && d < pres) {
          pres = d;
          trouve = p;
        }
      }
      return trouve;
    };
    const montrer = (p: PaysDuGlobe, clientX: number, clientY: number) => {
      const cadre = zone.getBoundingClientRect();
      if (survol !== p.code) {
        survol = p.code;
        globe?.update({ markers: marqueurs(p.code) });
        canvas.style.cursor = "pointer";
      }
      const y = clientY - cadre.top;
      setBulle({ p, x: clientX - cadre.left, y, dessous: y < cadre.height * 0.5 });
    };
    const quitter = () => {
      clearTimeout(finToucher);
      if (!survol) return;
      survol = null;
      setBulle(null);
      canvas.style.cursor = "";
      globe?.update({ markers: marqueurs(null) });
    };
    const passe = (e: PointerEvent) => {
      if (tire || e.pointerType === "touch") return;
      dessus = true;
      const p = paysSous(e.clientX, e.clientY);
      if (p) montrer(p, e.clientX, e.clientY);
      else quitter();
    };

    const appui = (e: PointerEvent) => {
      quitter();
      tire = { x: e.clientX, y: e.clientY, phi, theta };
    };
    const sortie = () => {
      dessus = false;
      quitter();
    };
    const glisse = (e: PointerEvent) => {
      if (!tire) return;
      phi = tire.phi + (e.clientX - tire.x) / 200;
      theta = Math.max(-1.2, Math.min(1.2, tire.theta + (e.clientY - tire.y) / 300));
    };
    const lache = (e: PointerEvent) => {
      if (!tire) return;
      const bouge = Math.hypot(e.clientX - tire.x, e.clientY - tire.y);
      tire = null;
      // Un toucher sans glisser, sur un pays : sa carte reste quelques secondes.
      const p = bouge < 8 ? paysSous(e.clientX, e.clientY) : null;
      if (!p) return;
      montrer(p, e.clientX, e.clientY);
      if (e.pointerType === "touch") finToucher = setTimeout(quitter, DUREE_TOUCHER);
    };
    canvas.addEventListener("pointerdown", appui);
    canvas.addEventListener("pointermove", passe, { passive: true });
    canvas.addEventListener("pointerleave", sortie);
    window.addEventListener("pointermove", glisse, { passive: true });
    window.addEventListener("pointerup", lache, { passive: true });

    return () => {
      clearTimeout(finToucher);
      cancelAnimationFrame(image);
      taille.disconnect();
      veille.disconnect();
      canvas.removeEventListener("pointerdown", appui);
      canvas.removeEventListener("pointermove", passe);
      canvas.removeEventListener("pointerleave", sortie);
      window.removeEventListener("pointermove", glisse);
      window.removeEventListener("pointerup", lache);
      globe?.destroy();
    };
  }, [pays, familles]);

  return (
    <div ref={scene} className={styles.scene}>
      <canvas ref={toile} className={`${styles.toile} ${pret ? styles.pret : ""}`} aria-hidden="true" />
      {bulle && (
        <div
          className={`${styles.carte} ${bulle.dessous ? styles.dessous : ""}`}
          style={{ left: bulle.x, top: bulle.y }}
        >
          <div className={styles.tete}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.drapeau} src={`/drapeaux/${bulle.p.code.toLowerCase()}.svg`} alt="" />
            <div>
              <p className={styles.nom}>{bulle.p.nom}</p>
              <p className={styles.nombre}>
                {bulle.p.n.toLocaleString("fr-FR")} talent{bulle.p.n > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {/* Les métiers du pays, à la couleur de leurs points. */}
          {familles.some((f) => (bulle.p.metiers?.[f.slug] ?? 0) > 0) && (
            <ul className={styles.metiers}>
              {familles
                .filter((f) => (bulle.p.metiers?.[f.slug] ?? 0) > 0)
                .map((f) => (
                  <li key={f.slug}>
                    <i style={{ background: f.couleur }} />
                    <span>{f.label}</span>
                    <strong>{(bulle.p.metiers?.[f.slug] ?? 0).toLocaleString("fr-FR")}</strong>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
