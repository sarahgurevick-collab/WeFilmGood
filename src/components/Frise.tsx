"use client";

import {
  type CSSProperties,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import form from "./form.module.css";
import styles from "./Frise.module.css";

/*
 * La frise horizontale (22/10/2026), d'après « Timeline » de Hyperiux
 * Vault (GSAP + ScrollTrigger + SplitText), réécrite sans Tailwind. On
 * descend dans la page : le panneau reste collé à l'écran et la frise
 * glisse vers la gauche ; à mesure, la ligne rouge s'étire, chaque étape
 * plante sa tige, son point, et son texte monte ligne par ligne.
 *
 * Deux usages : les appels à projets (FriseAppels, fond clair) et
 * « Notre histoire » (fond noir). La frise lit les couleurs de la page.
 *
 * Qui a demandé moins d'animations (prefers-reduced-motion) voit la frise
 * posée telle quelle, à faire défiler du doigt ou à la molette.
 */

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export type EtapeFrise = {
  id: string;
  /** L'image de l'étape : un logo rond, un logo large sur carte blanche,
      ou une affiche (portrait). */
  visuel?: { src: string; alt: string; forme?: "rond" | "carte" | "affiche" };
  /** Petit mot en capitales rouges au-dessus du titre (« Date limite »). */
  etiquette?: string;
  /** En gros : une date, une année. */
  titre: string;
  /** Le détail, en lignes (festival, format, phrase…). */
  detail: ReactNode;
  /** true pour une étape passée, en retrait (gris). */
  passe?: boolean;
};

export type FeuilleFrise = { libelle: string; contenu: ReactNode };

const REQUETE_MOINS_D_ANIMATIONS = "(prefers-reduced-motion: reduce)";

function ecouterMoinsDAnimations(rappel: () => void) {
  if (typeof window === "undefined") return () => {};
  const liste = window.matchMedia(REQUETE_MOINS_D_ANIMATIONS);
  liste.addEventListener("change", rappel);
  return () => liste.removeEventListener("change", rappel);
}

function lireMoinsDAnimations() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.(REQUETE_MOINS_D_ANIMATIONS)?.matches ?? false;
}

function useMoinsDAnimations() {
  return useSyncExternalStore(
    ecouterMoinsDAnimations,
    lireMoinsDAnimations,
    () => false,
  );
}

export default function Frise({
  etapes,
  titre,
  periode,
  image,
  imageAlt,
  feuilles = [],
}: {
  etapes: EtapeFrise[];
  titre: string;
  /** Sous le titre, en gris (« 2026 — 2027 »). */
  periode?: string;
  /** La grande image à gauche de la frise. */
  image: string;
  imageAlt: string;
  /** Un bouton par feuille : son libellé, et le texte qu'il ouvre
      par-dessus la page (le texte de l'appel, les lecteurs…). */
  feuilles?: FeuilleFrise[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const pisteRef = useRef<HTMLDivElement>(null);
  const ligneRef = useRef<HTMLDivElement>(null);
  const ligneCentraleRef = useRef<HTMLDivElement>(null);
  const dialogsRef = useRef<(HTMLDialogElement | null)[]>([]);
  const grandeRef = useRef<HTMLDialogElement>(null);
  // L'affiche ouverte en grand (Sarah, 22/10 : « les affiches peuvent être
  // cliquables pour être affichées en grand »).
  const [grande, setGrande] = useState<{ src: string; alt: string } | null>(null);
  const statique = useMoinsDAnimations();

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const piste = pisteRef.current;
    const ligne = ligneRef.current;
    const ligneCentrale = ligneCentraleRef.current;
    if (!section || !piste || !ligne || !ligneCentrale) return;

    if (statique) return;

    const ctx = gsap.context(() => {
      // De combien la frise doit glisser pour montrer sa fin, avec un peu
      // d'air à droite.
      const distance = () =>
        Math.max(0, piste.scrollWidth - window.innerWidth + window.innerWidth * 0.04);
      // La ligne va de son point de départ au point de la dernière étape :
      // mesurée à l'écran plutôt que déduite de la largeur de la zone, que
      // le navigateur de Sarah rendait trop courte (22/10).
      const poserLigne = () => {
        const points = section.querySelectorAll<HTMLElement>(`.${styles.point}`);
        const dernier = points[points.length - 1];
        if (!dernier) return;
        const r = dernier.getBoundingClientRect();
        const depart = ligneCentrale.getBoundingClientRect().left;
        ligneCentrale.style.width = `${r.left + r.width / 2 - depart}px`;
      };
      // La section est aussi haute que le chemin à parcourir : le panneau
      // reste collé pendant toute la glissade.
      const poserHauteur = () => {
        poserLigne();
        section.style.height = `${window.innerHeight + distance()}px`;
      };
      poserHauteur();

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true,
          onRefreshInit: poserHauteur,
        },
      });

      tl.fromTo(piste, { x: 0 }, { x: () => -distance(), duration: 1 }, 0);
      // La ligne court plus vite que la piste : dessinée en entier à
      // mi-parcours, elle précède toujours les étapes qui arrivent (Sarah,
      // 22/10 : « la ligne s'arrête trop tôt »).
      tl.fromTo(ligne, { scaleX: 0 }, { scaleX: 1, duration: 0.43 }, 0.02);

      const colonnes = gsap.utils.toArray<HTMLElement>(`.${styles.colonne}`);
      const decoupes: SplitText[] = [];
      const d = distance();
      const vw = window.innerWidth;
      // Chaque étape se révèle sur une trentaine de pour cent d'écran de
      // glissade, quel que soit le nombre d'étapes (trois appels ou
      // quinze années).
      const duree = d === 0 ? 0.25 : gsap.utils.clamp(0.06, 0.25, (vw * 0.3) / d);

      colonnes.forEach((colonne) => {
        const tige = colonne.querySelector<HTMLElement>(`.${styles.tige}`);
        const point = colonne.querySelector<HTMLElement>(`.${styles.point}`);
        const date = colonne.querySelector<HTMLElement>(`.${styles.date}`);
        const detail = colonne.querySelector<HTMLElement>(`.${styles.detail}`);
        const logo = colonne.querySelector<HTMLElement>(`.${styles.logo}`);
        if (!tige || !point || !date || !detail) return;

        const enHaut = colonne.classList.contains(styles.haut);
        gsap.set(tige, {
          scaleY: 0,
          transformOrigin: enHaut ? "bottom center" : "top center",
        });
        gsap.set(point, { scale: 0 });
        if (logo) gsap.set(logo, { scale: 0.6, autoAlpha: 0 });

        const dateDecoupee = new SplitText(date, { type: "lines", mask: "lines" });
        const detailDecoupe = new SplitText(detail, { type: "lines", mask: "lines" });
        decoupes.push(dateDecoupee, detailDecoupe);

        // Le moment où la colonne entre dans l'écran (à 85 % de sa
        // largeur), en fraction du chemin ; la première se révèle dès les
        // premiers tours de molette, la dernière avant la fin.
        const xPiste = Number(gsap.getProperty(piste, "x")) || 0;
        const x = colonne.getBoundingClientRect().left - xPiste;
        const debut =
          d === 0 ? 0.02 : gsap.utils.clamp(0.02, 1 - duree, (x - vw * 0.85) / d);

        tl.to(tige, { scaleY: 1, duration: duree * 0.4 }, debut)
          .to(point, { scale: 1, duration: duree * 0.4 }, debut);
        if (logo) {
          tl.to(
            logo,
            { scale: 1, autoAlpha: 1, duration: duree * 0.5, ease: "back.out(1.6)" },
            debut + duree * 0.1,
          );
        }
        tl.fromTo(
          dateDecoupee.lines,
          { y: "110%" },
          { y: "0%", duration: duree * 0.6, stagger: 0.02, ease: "power2.out" },
          debut + duree * 0.15,
        ).fromTo(
          detailDecoupe.lines,
          { y: "110%" },
          { y: "0%", duration: duree * 0.6, stagger: 0.02, ease: "power2.out" },
          debut + duree * 0.25,
        );
      });

      // Les polices arrivent après le premier rendu : on remesure une fois
      // la page posée.
      const id = window.setTimeout(() => ScrollTrigger.refresh(), 300);
      return () => {
        window.clearTimeout(id);
        decoupes.forEach((s) => s.revert());
      };
    }, section);

    return () => ctx.revert();
  }, [etapes.length, statique]);

  const ouvrir = (i: number) => dialogsRef.current[i]?.showModal();
  const fermer = (i: number) => dialogsRef.current[i]?.close();
  const agrandir = (visuel: { src: string; alt: string }) => {
    setGrande(visuel);
    grandeRef.current?.showModal();
  };
  const refermerGrande = () => grandeRef.current?.close();

  const classeVisuel = (forme?: "rond" | "carte" | "affiche") =>
    forme === "carte"
      ? `${styles.logo} ${styles.logoCarte}`
      : forme === "affiche"
        ? `${styles.logo} ${styles.affiche}`
        : styles.logo;

  return (
    <>
      <section
        ref={sectionRef}
        className={`${styles.section} ${statique ? styles.statique : ""}`}
        style={{ "--n": etapes.length } as CSSProperties}
        aria-label={titre}
      >
        <div className={styles.panneau}>
          <div ref={pisteRef} className={styles.piste}>
            <div className={styles.image}>
              <img src={image} alt={imageAlt} draggable={false} />
            </div>

            <div className={styles.zone}>
              <div
                ref={ligneCentraleRef}
                className={styles.ligneCentrale}
                aria-hidden="true"
              >
                <span className={styles.bout} />
                <div ref={ligneRef} className={styles.ligne} />
              </div>

              <div className={styles.entete}>
                <h1 className={styles.titre}>{titre}</h1>
                <div className={styles.sousEntete}>
                  {periode && <p className={styles.periode}>{periode}</p>}
                  {feuilles.length > 0 && (
                    <div className={styles.boutons}>
                      {feuilles.map((f, i) => (
                        <button
                          key={f.libelle}
                          type="button"
                          className={form.submit}
                          onClick={() => ouvrir(i)}
                        >
                          {f.libelle}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <ol className={styles.colonnes}>
                {etapes.map((etape, i) => {
                  const enHaut = i % 2 === 0;
                  return (
                    <li
                      key={etape.id}
                      className={`${styles.colonne} ${enHaut ? styles.haut : styles.bas} ${etape.passe ? styles.passe : ""}`}
                    >
                      <span className={styles.point} aria-hidden="true" />
                      <span className={styles.tige} aria-hidden="true" />
                      <div className={styles.contenu}>
                        {etape.visuel && etape.visuel.forme === "affiche" ? (
                          <button
                            type="button"
                            className={styles.boutonAffiche}
                            onClick={() => agrandir(etape.visuel!)}
                            aria-label={`Voir en grand : ${etape.visuel.alt}`}
                          >
                            <img
                              src={etape.visuel.src}
                              alt={etape.visuel.alt}
                              className={classeVisuel("affiche")}
                              draggable={false}
                            />
                          </button>
                        ) : etape.visuel ? (
                          <img
                            src={etape.visuel.src}
                            alt={etape.visuel.alt}
                            className={classeVisuel(etape.visuel.forme)}
                            draggable={false}
                          />
                        ) : null}
                        {etape.etiquette && (
                          <p className={styles.etiquette}>{etape.etiquette}</p>
                        )}
                        <h2 className={styles.date}>{etape.titre}</h2>
                        <p className={styles.detail}>{etape.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <dialog
        ref={grandeRef}
        className={styles.dialogueImage}
        aria-label={grande?.alt ?? "Affiche"}
        onClick={(e) => {
          if (e.target === e.currentTarget) refermerGrande();
        }}
        onClose={() => setGrande(null)}
      >
        {grande && (
          <figure className={styles.grande}>
            <button
              type="button"
              className={styles.fermerGrande}
              onClick={refermerGrande}
              aria-label="Fermer"
            >
              ×
            </button>
            <img src={grande.src} alt={grande.alt} draggable={false} />
            <figcaption>{grande.alt}</figcaption>
          </figure>
        )}
      </dialog>

      {feuilles.map((f, i) => (
        <dialog
          key={f.libelle}
          ref={(el) => {
            dialogsRef.current[i] = el;
          }}
          className={styles.dialogue}
          aria-label={f.libelle}
          onClick={(e) => {
            // Un clic sur le voile, hors de la feuille, ferme.
            if (e.target === e.currentTarget) fermer(i);
          }}
        >
          <div className={styles.feuille}>
            <button
              type="button"
              className={styles.fermer}
              onClick={() => fermer(i)}
              aria-label="Fermer"
            >
              ×
            </button>
            <div className={styles.texte}>{f.contenu}</div>
          </div>
        </dialog>
      ))}
    </>
  );
}
