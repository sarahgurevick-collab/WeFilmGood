"use client";

import createGlobe from "cobe";
import { useEffect, useRef, useState } from "react";
import { POSITIONS_PAYS } from "@/data/positionsPays";
import styles from "./GlobePays.module.css";

/**
 * Le globe Terre des pays (essai du 13/11/2026, Sarah, d'après « cobe globe »
 * de 21st.dev) : une Terre en points qui tourne. Dans chaque pays, un point
 * par métier, à la couleur de ce métier sur l'anneau d'à côté, plus gros
 * quand ce métier y compte plus de talents (14/11, Sarah : « Ma fille a
 * compris qu'il n'y avait que des scénaristes sur le globe » — avant, un
 * seul point rouge par pays). Le globe
 * tourne tout seul jusqu'à un pays parmi les mieux représentés, sa carte sort
 * (drapeau, nom, nombre de talents), puis il part vers le suivant. On peut le
 * faire tourner à la main. Quand la souris passe sur un pays (ou qu'on le
 * touche du doigt), son drapeau, son nom et son nombre de talents s'affichent
 * au-dessus et le globe s'arrête (14/11, Sarah : « c'est dommage que le nom
 * du pays ne s'affiche pas quand je passe la souris dessus »). Globe d'avant : étiquette git
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
  familles = [],
  dureeVedette = 2800,
}: {
  pays: PaysDuGlobe[];
  /** Les métiers montrés, chacun avec sa couleur. */
  familles?: FamilleDuGlobe[];
  /** Les codes des pays qui sortent en exemple. */
  vedettes: string[];
  dureeVedette?: number;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);
  const [pret, setPret] = useState(false);
  // Le pays dont la carte est sortie.
  const [vedette, setVedette] = useState<PaysDuGlobe | null>(null);
  // Le pays sous la souris, et où poser sa bulle dans la scène.
  const [bulle, setBulle] = useState<{ p: PaysDuGlobe; x: number; y: number } | null>(null);

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
    const candidats = places.filter((p) => vedettes.includes(p.code));

    // Au départ : la France face à nous.
    let [phi, theta] = anglesDe(POSITIONS_PAYS.FR ?? [46, 2]);
    let cible: [number, number] | null = null;
    let tire: { x: number; y: number; phi: number; theta: number } | null = null;
    let visible = true;
    let image = 0;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    let dernier: string | null = null;
    // Le pays sous la souris (ou touché du doigt) : le globe l'attend.
    let survol: string | null = null;
    let finToucher: ReturnType<typeof setTimeout> | undefined;
    let globe: ReturnType<typeof createGlobe> | null = null;

    const suivant = () => {
      clearTimeout(minuterie);
      setVedette(null);
      globe?.update({ markers: marqueurs(null) });
      if (calme || candidats.length === 0) return;
      if (!visible || tire || survol) {
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
        cible = null;
        clearTimeout(minuterie);
        setVedette(null);
        globe?.update({ markers: marqueurs(p.code) });
        canvas.style.cursor = "pointer";
      }
      setBulle({ p, x: clientX - cadre.left, y: clientY - cadre.top });
    };
    const quitter = () => {
      clearTimeout(finToucher);
      if (!survol) return;
      survol = null;
      setBulle(null);
      canvas.style.cursor = "";
      globe?.update({ markers: marqueurs(null) });
      clearTimeout(minuterie);
      minuterie = setTimeout(suivant, 1500);
    };
    const passe = (e: PointerEvent) => {
      if (tire || e.pointerType === "touch") return;
      const p = paysSous(e.clientX, e.clientY);
      if (p) montrer(p, e.clientX, e.clientY);
      else quitter();
    };

    const appui = (e: PointerEvent) => {
      quitter();
      tire = { x: e.clientX, y: e.clientY, phi, theta };
      cible = null;
      setVedette(null);
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
      clearTimeout(minuterie);
      // Un toucher sans glisser, sur un pays : sa bulle reste trois secondes.
      const p = bouge < 8 ? paysSous(e.clientX, e.clientY) : null;
      if (p) {
        montrer(p, e.clientX, e.clientY);
        if (e.pointerType === "touch") finToucher = setTimeout(quitter, 3000);
        return;
      }
      minuterie = setTimeout(suivant, 2500);
    };
    canvas.addEventListener("pointerdown", appui);
    canvas.addEventListener("pointermove", passe, { passive: true });
    canvas.addEventListener("pointerleave", quitter);
    window.addEventListener("pointermove", glisse, { passive: true });
    window.addEventListener("pointerup", lache, { passive: true });

    return () => {
      clearTimeout(minuterie);
      clearTimeout(finToucher);
      cancelAnimationFrame(image);
      taille.disconnect();
      veille.disconnect();
      canvas.removeEventListener("pointerdown", appui);
      canvas.removeEventListener("pointermove", passe);
      canvas.removeEventListener("pointerleave", quitter);
      window.removeEventListener("pointermove", glisse);
      window.removeEventListener("pointerup", lache);
      globe?.destroy();
    };
  }, [pays, vedettes, familles, dureeVedette]);

  return (
    <div ref={scene} className={styles.scene}>
      <canvas ref={toile} className={`${styles.toile} ${pret ? styles.pret : ""}`} aria-hidden="true" />
      {bulle && (
        <div className={styles.bulle} style={{ left: bulle.x, top: bulle.y }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/drapeaux/${bulle.p.code.toLowerCase()}.svg`} alt="" />
          <span>
            <strong>{bulle.p.nom}</strong>
            <em>
              {bulle.p.n.toLocaleString("fr-FR")} talent{bulle.p.n > 1 ? "s" : ""}
            </em>
          </span>
        </div>
      )}
      {vedette && !bulle && (
        <>
          <span className={styles.repere} aria-hidden="true" />
          <div key={vedette.code} className={styles.carte}>
            <div className={styles.tete}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.drapeau} src={`/drapeaux/${vedette.code.toLowerCase()}.svg`} alt="" />
              <div>
                <p className={styles.nom}>{vedette.nom}</p>
                <p className={styles.nombre}>
                  {vedette.n.toLocaleString("fr-FR")} talent{vedette.n > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {/* Les métiers du pays, à la couleur de leurs points. */}
            <ul className={styles.metiers}>
              {familles
                .filter((f) => (vedette.metiers?.[f.slug] ?? 0) > 0)
                .map((f) => (
                  <li key={f.slug}>
                    <i style={{ background: f.couleur }} />
                    <span>{f.label}</span>
                    <strong>{(vedette.metiers?.[f.slug] ?? 0).toLocaleString("fr-FR")}</strong>
                  </li>
                ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
