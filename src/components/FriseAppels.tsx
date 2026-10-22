"use client";

import {
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import {
  annee,
  dateEnLettres,
  type Appel,
} from "@/app/appels-a-projets/appels";
import styles from "./FriseAppels.module.css";

/*
 * ESSAI (22/10/2026) — la frise des appels à projets, d'après « Timeline »
 * de Hyperiux Vault (GSAP + ScrollTrigger + SplitText), réécrite sans
 * Tailwind. On descend dans la page : le panneau reste collé à l'écran et
 * la frise glisse vers la gauche ; à mesure, la ligne rouge s'étire, chaque
 * appel plante sa tige, son point, et son texte monte ligne par ligne.
 * En évidence : la date limite et le logo du festival. Page d'avant :
 * étiquette git « appels-a-projets-avant-frise ».
 *
 * Qui a demandé moins d'animations (prefers-reduced-motion) voit la frise
 * posée telle quelle, à faire défiler du doigt ou à la molette.
 */

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

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

export default function FriseAppels({
  appels,
  aujourdHui,
  titre,
  texteAppel,
  libelleBouton,
}: {
  appels: Appel[];
  /** La date du jour (AAAA-MM-JJ), décidée par le serveur pour que le rendu
      soit le même des deux côtés. */
  aujourdHui: string;
  titre: string;
  /** Le texte de l'appel à projets, ouvert par le bouton. */
  texteAppel: ReactNode;
  libelleBouton: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const pisteRef = useRef<HTMLDivElement>(null);
  const ligneRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const statique = useMoinsDAnimations();

  const annees = appels.map((a) => annee(a.dateLimite));
  const periode =
    annees.length === 0
      ? ""
      : annees[0] === annees[annees.length - 1]
        ? annees[0]
        : `${annees[0]} — ${annees[annees.length - 1]}`;

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const piste = pisteRef.current;
    const ligne = ligneRef.current;
    if (!section || !piste || !ligne) return;

    if (statique) return;

    const ctx = gsap.context(() => {
      // De combien la frise doit glisser pour montrer sa fin, avec un peu
      // d'air à droite.
      const distance = () =>
        Math.max(0, piste.scrollWidth - window.innerWidth + window.innerWidth * 0.04);
      // La section est aussi haute que le chemin à parcourir : le panneau
      // reste collé pendant toute la glissade.
      const poserHauteur = () => {
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
      tl.fromTo(ligne, { width: "0%" }, { width: "98%", duration: 0.95 }, 0.02);

      const colonnes = gsap.utils.toArray<HTMLElement>(`.${styles.colonne}`);
      const decoupes: SplitText[] = [];

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

        // Le moment où la colonne arrive aux trois quarts de l'écran, en
        // fraction du chemin ; la première se révèle dès les premiers tours
        // de molette, la dernière avant la fin de la glissade.
        const d = distance();
        const x = colonne.offsetLeft;
        const debut =
          d === 0
            ? 0.02
            : gsap.utils.clamp(0.02, 0.72, (x - window.innerWidth * 0.75) / d);
        const duree = 0.22;

        tl.to(tige, { scaleY: 1, duration: duree * 0.4 }, debut)
          .to(point, { scale: 1, duration: duree * 0.4 }, debut)
          .to(
            logo,
            { scale: 1, autoAlpha: 1, duration: duree * 0.5, ease: "back.out(1.6)" },
            debut + duree * 0.1,
          )
          .fromTo(
            dateDecoupee.lines,
            { y: "110%" },
            { y: "0%", duration: duree * 0.6, stagger: 0.02, ease: "power2.out" },
            debut + duree * 0.15,
          )
          .fromTo(
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
  }, [appels.length, statique]);

  const ouvrir = () => dialogRef.current?.showModal();
  const fermer = () => dialogRef.current?.close();

  return (
    <>
      <section
        ref={sectionRef}
        className={`${styles.section} ${statique ? styles.statique : ""}`}
        aria-label={titre}
      >
        <div className={styles.panneau}>
          <div ref={pisteRef} className={styles.piste}>
            <div className={styles.image}>
              <img
                src="/association/rencontres/01.jpg"
                alt="Rencontres auteurs-producteurs au Marché du Film de Cannes"
                draggable={false}
              />
            </div>

            <div className={styles.zone}>
              <div className={styles.ligneCentrale} aria-hidden="true">
                <span className={styles.bout} />
                <div ref={ligneRef} className={styles.ligne} />
                <span className={styles.bout} />
              </div>

              <div className={styles.entete}>
                <h1 className={styles.titre}>{titre}</h1>
                <div className={styles.sousEntete}>
                  <p className={styles.periode}>{periode}</p>
                  <button type="button" className={styles.bouton} onClick={ouvrir}>
                    {libelleBouton}
                  </button>
                </div>
              </div>

              <ol className={styles.colonnes}>
                {appels.map((appel, i) => {
                  const passe = appel.dateLimite < aujourdHui;
                  const enHaut = i % 2 === 0;
                  return (
                    <li
                      key={appel.id}
                      className={`${styles.colonne} ${enHaut ? styles.haut : styles.bas} ${passe ? styles.passe : ""}`}
                    >
                      <span className={styles.point} aria-hidden="true" />
                      <span className={styles.tige} aria-hidden="true" />
                      <div className={styles.contenu}>
                        <img
                          src={appel.logo}
                          alt={appel.festival}
                          className={`${styles.logo} ${appel.logoLarge ? styles.logoLarge : ""}`}
                          draggable={false}
                        />
                        <p className={styles.etiquette}>
                          {passe ? "Édition précédente" : "Date limite"}
                        </p>
                        <h2 className={styles.date}>
                          {dateEnLettres(appel.dateLimite)}
                        </h2>
                        <p className={styles.detail}>
                          <strong>{appel.festival}</strong> · {appel.format}
                          <br />
                          {appel.edition}
                          <br />
                          {appel.evenement}
                          {appel.heureLimite && !passe && (
                            <>
                              <br />
                              Jusqu&apos;à {appel.heureLimite}
                            </>
                          )}
                        </p>
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
        ref={dialogRef}
        className={styles.dialogue}
        aria-label={libelleBouton}
        onClick={(e) => {
          // Un clic sur le voile, hors de la feuille, ferme.
          if (e.target === e.currentTarget) fermer();
        }}
      >
        <div className={styles.feuille}>
          <button
            type="button"
            className={styles.fermer}
            onClick={fermer}
            aria-label="Fermer"
          >
            ×
          </button>
          <div className={styles.texte}>{texteAppel}</div>
        </div>
      </dialog>
    </>
  );
}
