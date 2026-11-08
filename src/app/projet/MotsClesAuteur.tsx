"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import formStyles from "@/components/form.module.css";
import NuageDisque from "@/components/NuageDisque";
import { createClient } from "@/lib/supabase/client";
import { useLangueDuGlobe } from "@/lib/langue-globe";
import styles from "./mots-cles-auteur.module.css";

/** Dix mots au plus par thème (07/11/2026, Sarah : « Limite à 10 par catégorie »). */
export const MAXIMUM_MOTS_AUTEUR = 10;
/** Combien de mots le nuage montre, réglable au − et au +, comme le nuage du Finder. */
const DEFAUT = 80;
const PAS = 20;
const MIN = 20;
const MAX = 200;

type CleNuage = "styles" | "sujets" | "univers";
/** Les trois nuages lus en base (fonction nuages_mots_cles_fiche) : [mot, nombre de fiches sur WFG 1, mot anglais]. */
export type Nuages = Partial<Record<CleNuage, [string, number, (string | null)?][]>>;
/** Un mot proposé pendant la frappe, avec son thème (null s'il n'est pas encore classé) et son anglais. */
type Suggestion = { label: string; theme: string | null; label_en?: string | null };
/** Un mot déjà choisi, tel qu'il arrive de la base : le français, son thème, son anglais. */
export type MotInitial = { mot: string; theme: string | null; motEn?: string | null };

/** Les trois thèmes (07/11/2026, Sarah) ; en anglais quand le globe l'est (08/11). */
const THEMES: { cle: CleNuage; titre: string; titreEn: string }[] = [
  { cle: "styles", titre: "Sous-genres & styles", titreEn: "Sub-genres & styles" },
  { cle: "sujets", titre: "Sujets & personnages", titreEn: "Subjects & characters" },
  { cle: "univers", titre: "Univers & Lieux", titreEn: "Worlds & places" },
];

const cleDe = (mot: string) =>
  mot
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/**
 * Les mots-clés choisis par l'auteur (07/11/2026, Sarah), présentés comme le
 * Finder. Chaque mot appartient à un des trois thèmes (Sarah : « j'ai besoin
 * d'avoir des mots clés dans ces 3 catégories ») : le bouton passe d'un thème
 * à l'autre, le nuage du Finder (NuageDisque) change avec lui.
 *
 * Les mots choisis du thème affiché remplissent la barre, entre le bouton et
 * le champ, comme les tags du Finder (Sarah : « que les mots clés
 * remplissent la barre de recherche et pas une autre barre en dessous du
 * nuage ») ; la croix les retire. Dix au plus par thème.
 *
 * Deux façons de choisir : un clic dans le nuage, ou taper dans le champ, qui
 * ne propose que des mots existants (nuages + mots posés par l'IA) — aucun
 * mot nouveau, donc aucune faute. Un mot tapé va dans son thème (celui de son
 * nuage, ou keywords.theme, classé par Claude), qui s'affiche ; s'il n'est pas
 * encore classé, dans le thème du bouton.
 * Le formulaire envoie chaque mot avec son thème ; la base ignore tout mot
 * inconnu et range le thème (project_keywords.theme_auteur).
 */
export default function MotsClesAuteur({
  initiaux,
  nuages,
}: {
  initiaux: MotInitial[];
  nuages: Nuages;
}) {
  // L'anglais de chaque mot connu (nuages, mots déjà choisis, suggestions prises) :
  // le mot reste le français partout en coulisse, l'anglais n'est qu'à l'affichage (08/11).
  const [anglais, setAnglais] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const { cle } of THEMES) for (const [mot, , en] of nuages[cle] ?? []) if (en) m.set(mot, en);
    for (const { mot, motEn } of initiaux) if (motEn) m.set(mot, motEn);
    return m;
  });
  // Où se trouve chaque mot des nuages, pour ranger les mots choisis.
  const ligneDe = useMemo(() => {
    const m = new Map<string, { cle: CleNuage; mot: string }>();
    for (const { cle } of THEMES) for (const [mot] of nuages[cle] ?? []) m.set(cleDe(mot), { cle, mot });
    return m;
  }, [nuages]);

  const [choisis, setChoisis] = useState<Record<CleNuage, string[]>>(() => {
    const depart: Record<CleNuage, string[]> = { styles: [], sujets: [], univers: [] };
    for (const { mot, theme: rangé } of initiaux) {
      // Le nuage d'abord, puis le thème rangé ; un ancien mot sans thème va dans les sujets.
      const trouve = ligneDe.get(cleDe(mot));
      const cle: CleNuage = trouve
        ? trouve.cle
        : THEMES.some((t) => t.cle === rangé)
          ? (rangé as CleNuage)
          : "sujets";
      if (depart[cle].length < MAXIMUM_MOTS_AUTEUR) depart[cle].push(trouve ? trouve.mot : mot);
    }
    return depart;
  });
  const [theme, setTheme] = useState<CleNuage>("styles");
  const [combien, setCombien] = useState(DEFAUT);
  const [saisie, setSaisie] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tous = [...choisis.styles, ...choisis.sujets, ...choisis.univers];
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
      if (!annule) setSuggestions((data ?? []) as Suggestion[]);
    }, 200);
    return () => {
      annule = true;
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [saisie]);

  const basculer = (cle: CleNuage, mot: string) =>
    setChoisis((avant) => {
      const liste = avant[cle];
      if (liste.includes(mot)) return { ...avant, [cle]: liste.filter((x) => x !== mot) };
      if (liste.length >= MAXIMUM_MOTS_AUTEUR) return avant;
      return { ...avant, [cle]: [...liste, mot] };
    });

  /**
   * Un mot suggéré va dans son thème : celui de son nuage, sinon celui que
   * Claude lui a donné (keywords.theme) ; le bouton passe sur ce thème pour
   * qu'on voie où il est rangé. Un mot pas encore classé va dans le thème du bouton.
   */
  const prendre = ({ label: suggere, theme: sonTheme, label_en }: Suggestion) => {
    const trouve = ligneDe.get(cleDe(suggere));
    if (label_en) setAnglais((avant) => new Map(avant).set(trouve ? trouve.mot : suggere, label_en));
    const cle: CleNuage = trouve ? trouve.cle : THEMES.some((t) => t.cle === sonTheme) ? (sonTheme as CleNuage) : theme;
    if (!dejaChoisi(suggere)) basculer(cle, trouve ? trouve.mot : suggere);
    setTheme(cle);
    setSaisie("");
    setSuggestions([]);
  };

  const proposees = suggestions.filter((s) => !dejaChoisi(s.label));
  const langue = useLangueDuGlobe();
  const leTheme = THEMES.find((t) => t.cle === theme)!;
  const titre = langue === "en" ? leTheme.titreEn : leTheme.titre;
  const en = langue === "en";
  const montre = (mot: string) => (en && anglais.get(mot)) || mot;
  const themeSuivant = () => setTheme(THEMES[(THEMES.findIndex((t) => t.cle === theme) + 1) % THEMES.length].cle);

  // Le nuage du thème : les mots les plus utilisés, plus ceux déjà choisis qui seraient plus loin.
  const mots = nuages[theme] ?? [];
  const liste = choisis[theme];
  const plein = liste.length >= MAXIMUM_MOTS_AUTEUR;
  const motsNuage = useMemo(() => {
    const premiers = mots.slice(0, combien);
    const loin = mots.slice(combien).filter(([m]) => liste.includes(m));
    return [...premiers, ...loin].map(([label, effectif, labelEn]) => ({ label, effectif, labelEn }));
  }, [mots, combien, liste]);

  return (
    <div className={formStyles.field} data-visite="mots-cles">
      <span id="mots-cles-auteur-libelle">
        Optimisez la recherche avec des mots-clés adaptés à votre projet pour booster sa visibilité.
      </span>
      {THEMES.flatMap(({ cle }) =>
        choisis[cle].map((m) => (
          <span key={m} hidden>
            <input type="hidden" name="mots_cles_auteur" value={m} />
            <input type="hidden" name="mots_cles_auteur_theme" value={cle} />
          </span>
        )),
      )}

      {/* Le bouton des thèmes dans le champ lui-même, comme le Finder : un clic passe au suivant. */}
      <div className={styles.zoneSaisie}>
        <span className={styles.champModes}>
          <motion.button
            type="button"
            layout
            transition={{ layout: { type: "spring", damping: 22, stiffness: 260 } }}
            className={`${styles.mode} notranslate`}
            translate="no"
            data-theme={theme}
            onClick={themeSuivant}
            aria-label={langue === "en" ? `${titre}. Click to change` : `${titre}. Cliquer pour changer`}
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
          {/* Les mots choisis du thème, dans la barre comme les tags du Finder. */}
          <AnimatePresence initial={false}>
            {liste.map((m) => (
              <motion.button
                key={m}
                type="button"
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className={styles.tag}
                data-theme={theme}
                onClick={() => basculer(theme, m)}
                aria-label={`Retirer ${montre(m)}`}
              >
                {montre(m)}
                <span className={styles.tagCroix} aria-hidden="true">
                  ×
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
          {THEMES.some(({ cle }) => choisis[cle].length < MAXIMUM_MOTS_AUTEUR) && (
            <input
              type="text"
              className={styles.champModesInput}
              placeholder="Tapez un mot-clé ou piochez dans le nuage…"
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
              <li key={s.label}>
                <button type="button" role="option" aria-selected={false} onClick={() => prendre(s)}>
                  {(en && s.label_en) || s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Le nuage du thème choisi, celui du Finder. */}
      <div className={styles.nuage} data-theme={theme}>
        <div className={styles.nuageEntete}>
          {/* « notranslate » : la traduction automatique fige le texte qu'elle a
              traduit, et le compteur restait à 0 en anglais (08/11). */}
          <span className={`${plein ? styles.plein : ""} notranslate`} translate="no">
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
        <NuageDisque mots={motsNuage} choisis={liste} bloque={plein} enAnglais={en} onChoisir={(mot) => basculer(theme, mot)} />
      </div>

    </div>
  );
}
