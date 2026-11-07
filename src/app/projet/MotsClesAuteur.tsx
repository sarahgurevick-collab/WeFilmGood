"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import formStyles from "@/components/form.module.css";
import NuageDisque from "@/components/NuageDisque";
import { createClient } from "@/lib/supabase/client";
import styles from "./mots-cles-auteur.module.css";

/** Dix mots au plus par thème (07/11/2026, Sarah : « Limite à 10 par catégorie »). */
export const MAXIMUM_MOTS_AUTEUR = 10;
/** Combien de mots le nuage montre, réglable au − et au +, comme le nuage du Finder. */
const DEFAUT = 80;
const PAS = 20;
const MIN = 20;
const MAX = 200;

type CleNuage = "styles" | "sujets" | "univers";
type Cle = CleNuage | "libres";
/** Les trois nuages lus en base (fonction nuages_mots_cles_fiche) : [mot, nombre de fiches sur WFG 1]. */
export type Nuages = Partial<Record<CleNuage, [string, number][]>>;

/** Les trois thèmes (07/11/2026, Sarah). */
const THEMES: { cle: CleNuage; titre: string }[] = [
  { cle: "styles", titre: "Sous-genres & styles" },
  { cle: "sujets", titre: "Sujets & personnages" },
  { cle: "univers", titre: "Univers & Lieux" },
];

const cleDe = (mot: string) =>
  mot
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/**
 * Les mots-clés choisis par l'auteur, sous la logline (07/11/2026, Sarah).
 * Présentés comme le Finder : un bouton qui passe d'un thème à l'autre
 * (Sous-genres & styles, Sujets & personnages, Univers & Lieux), et le nuage
 * du Finder (NuageDisque) qui change avec lui. Les mots viennent de WFG 1
 * (table nuages_mots_cles) ; un clic choisit un mot, qui passe sur fond rouge,
 * un second le retire ; dix au plus par thème.
 *
 * Dans le même champ, à droite du bouton, on peut taper un autre mot : seuls
 * des mots existants sont proposés (Sarah : « le site se nourrit des mots
 * clés des nouvelles fiches ») — ceux des nuages et ceux que l'IA a posés sur
 * des fiches. Aucun mot nouveau, donc aucune faute. Un mot suggéré qui est
 * dans un nuage y est coché, et le nuage s'ouvre sur son thème.
 * Le formulaire envoie un champ caché par mot ; la base ignore tout mot inconnu.
 */
export default function MotsClesAuteur({ initiaux, nuages }: { initiaux: string[]; nuages: Nuages }) {
  // Où se trouve chaque mot des nuages, pour ranger les mots choisis.
  const ligneDe = useMemo(() => {
    const m = new Map<string, { cle: CleNuage; mot: string }>();
    for (const { cle } of THEMES) for (const [mot] of nuages[cle] ?? []) m.set(cleDe(mot), { cle, mot });
    return m;
  }, [nuages]);

  const [choisis, setChoisis] = useState<Record<Cle, string[]>>(() => {
    const depart: Record<Cle, string[]> = { styles: [], sujets: [], univers: [], libres: [] };
    for (const brut of initiaux) {
      const trouve = ligneDe.get(cleDe(brut));
      const cle: Cle = trouve ? trouve.cle : "libres";
      if (depart[cle].length < MAXIMUM_MOTS_AUTEUR) depart[cle].push(trouve ? trouve.mot : brut);
    }
    return depart;
  });
  const [theme, setTheme] = useState<CleNuage>("styles");
  const [combien, setCombien] = useState(DEFAUT);
  const [saisie, setSaisie] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tous = [...choisis.styles, ...choisis.sujets, ...choisis.univers, ...choisis.libres];
  const dejaChoisi = (mot: string) => tous.some((x) => cleDe(x) === cleDe(mot));

  // Les suggestions pendant la frappe, à partir de deux lettres.
  useEffect(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    const q = saisie.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    let annule = false;
    minuteur.current = setTimeout(async () => {
      const { data } = await createClient().rpc("suggerer_mots_cles", { q, p_limite: 8 });
      if (!annule) setSuggestions(((data ?? []) as { label: string }[]).map((d) => d.label));
    }, 200);
    return () => {
      annule = true;
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [saisie]);

  const basculer = (cle: Cle, mot: string) =>
    setChoisis((avant) => {
      const liste = avant[cle];
      if (liste.includes(mot)) return { ...avant, [cle]: liste.filter((x) => x !== mot) };
      if (liste.length >= MAXIMUM_MOTS_AUTEUR) return avant;
      return { ...avant, [cle]: [...liste, mot] };
    });

  /** Un mot suggéré : coché dans son nuage s'il y est (le nuage passe sur son thème), sinon ajouté aux autres mots. */
  const prendre = (suggere: string) => {
    const trouve = ligneDe.get(cleDe(suggere));
    if (!dejaChoisi(suggere)) basculer(trouve ? trouve.cle : "libres", trouve ? trouve.mot : suggere);
    if (trouve) setTheme(trouve.cle);
    setSaisie("");
    setSuggestions([]);
  };

  const proposees = suggestions.filter((s) => !dejaChoisi(s));
  const titre = THEMES.find((t) => t.cle === theme)!.titre;
  const themeSuivant = () => setTheme(THEMES[(THEMES.findIndex((t) => t.cle === theme) + 1) % THEMES.length].cle);

  // Le nuage du thème : les mots les plus utilisés, plus ceux déjà choisis qui seraient plus loin.
  const mots = nuages[theme] ?? [];
  const liste = choisis[theme];
  const plein = liste.length >= MAXIMUM_MOTS_AUTEUR;
  const motsNuage = useMemo(() => {
    const premiers = mots.slice(0, combien);
    const loin = mots.slice(combien).filter(([m]) => liste.includes(m));
    return [...premiers, ...loin].map(([label, effectif]) => ({ label, effectif }));
  }, [mots, combien, liste]);

  return (
    <div className={formStyles.field}>
      <span id="mots-cles-auteur-libelle">
        Optimisez la recherche avec des mots-clés adaptés à votre projet pour booster sa visibilité.
      </span>
      {tous.map((m) => (
        <input key={m} type="hidden" name="mots_cles_auteur" value={m} />
      ))}

      {/* Le bouton des thèmes dans le champ lui-même, comme le Finder : un clic passe au suivant. */}
      <div className={styles.zoneSaisie}>
        <span className={styles.champModes}>
          <motion.button
            type="button"
            layout
            transition={{ layout: { type: "spring", damping: 22, stiffness: 260 } }}
            className={styles.mode}
            data-theme={theme}
            onClick={themeSuivant}
            aria-label={`${titre}. Cliquer pour changer`}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={theme} className={styles.modeMot}>
                {titre.split("").map((lettre, i) => (
                  <motion.span
                    key={`${theme}-${i}`}
                    className={styles.modeLettre}
                    initial={{ opacity: 0, rotateX: 80, y: 8, filter: "blur(3px)" }}
                    animate={{ opacity: 1, rotateX: 0, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, rotateX: -80, y: -8, filter: "blur(3px)" }}
                    transition={{ delay: 0.015 * i, type: "spring", damping: 16, stiffness: 240, mass: 1.2 }}
                  >
                    {lettre}
                  </motion.span>
                ))}
              </motion.span>
            </AnimatePresence>
            <svg className={styles.modeFleches} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 9l5-5 5 5M7 15l5 5 5-5" />
            </svg>
          </motion.button>
          {choisis.libres.length < MAXIMUM_MOTS_AUTEUR && (
            <input
              type="text"
              className={styles.champModesInput}
              maxLength={60}
              aria-labelledby="mots-cles-auteur-libelle"
              autoComplete="off"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => {
                // Entrée prend la première suggestion au lieu d'envoyer le formulaire.
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (proposees[0]) prendre(proposees[0]);
                }
                if (e.key === "Escape") setSuggestions([]);
              }}
            />
          )}
        </span>
        {proposees.length > 0 && (
          <ul className={styles.suggestions} role="listbox">
            {proposees.map((s) => (
              <li key={s}>
                <button type="button" role="option" aria-selected={false} onClick={() => prendre(s)}>
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Le nuage du thème choisi, celui du Finder. */}
      <div className={styles.nuage} data-theme={theme}>
        <div className={styles.nuageEntete}>
          <span className={plein ? styles.plein : undefined}>
            {liste.length}/{MAXIMUM_MOTS_AUTEUR}
          </span>
          <div className={styles.reglage}>
            <button
              type="button"
              onClick={() => setCombien((n) => Math.max(MIN, n - PAS))}
              disabled={combien <= MIN}
              aria-label="Afficher moins de mots-clés"
              title="Moins de mots-clés"
            >
              −
            </button>
            <span>{Math.min(combien, mots.length)} mots</span>
            <button
              type="button"
              onClick={() => setCombien((n) => Math.min(MAX, n + PAS))}
              disabled={combien >= MAX || combien >= mots.length}
              aria-label="Afficher plus de mots-clés"
              title="Plus de mots-clés"
            >
              +
            </button>
          </div>
        </div>
        <NuageDisque mots={motsNuage} choisis={liste} bloque={plein} onChoisir={(mot) => basculer(theme, mot)} />
      </div>

      {/* Les autres mots, choisis parmi les suggestions. */}
      {choisis.libres.length > 0 && (
        <ul className={styles.mots}>
          {choisis.libres.map((m) => (
            <li key={m} className={styles.mot}>
              <span>{m}</span>
              <button type="button" className={styles.retirer} onClick={() => basculer("libres", m)}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
