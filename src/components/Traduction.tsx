"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./Traduction.module.css";

/**
 * La traduction automatique de tout le site, par Google Traduction.
 *
 * Un rond « globe » en bas à droite, à côté du bouton de contact, sur
 * toutes les pages. On choisit sa langue, la page se recharge traduite,
 * et le choix suit la personne de page en page (cookie « googtrans »,
 * celui que lit le module de Google).
 *
 * Le script de Google n'est chargé que si une autre langue que le
 * français est choisie : un visiteur francophone n'envoie rien à Google.
 */
const LANGUES = [
  { code: "fr", nom: "Français" },
  { code: "en", nom: "English" },
  { code: "es", nom: "Español" },
  { code: "it", nom: "Italiano" },
  { code: "de", nom: "Deutsch" },
  { code: "pt", nom: "Português" },
  { code: "ar", nom: "العربية" },
];

declare global {
  interface Window {
    initTraduction?: () => void;
    google?: {
      translate?: {
        TranslateElement: new (options: object, id: string) => unknown;
      };
    };
  }
}

function langueChoisie(): string {
  const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[a-z-]+\/([a-zA-Z-]+)/);
  return m ? m[1] : "fr";
}

function poserCookie(valeur: string | null) {
  const expire = valeur ? "" : "; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  const contenu = valeur ?? "";
  const hote = window.location.hostname;
  const domaineParent = hote.split(".").slice(-2).join(".");
  // Le module de Google pose parfois son cookie sur le domaine parent :
  // on écrit (ou efface) aux trois endroits pour ne jamais en laisser un
  // ancien qui retraduirait la page.
  document.cookie = `googtrans=${contenu}; path=/${expire}`;
  document.cookie = `googtrans=${contenu}; path=/; domain=${hote}${expire}`;
  document.cookie = `googtrans=${contenu}; path=/; domain=.${domaineParent}${expire}`;
}

// La langue se lit dans le cookie, côté navigateur seulement ; le
// serveur, qui ne le voit pas, affiche le français.
const sAbonner = () => () => {};

export default function Traduction() {
  const langue = useSyncExternalStore(sAbonner, langueChoisie, () => "fr");
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (langueChoisie() === "fr" || document.getElementById("script-traduction")) return;

    window.initTraduction = () => {
      if (!window.google?.translate) return;
      new window.google.translate.TranslateElement(
        { pageLanguage: "fr", autoDisplay: false },
        "traduction-google",
      );
    };
    const script = document.createElement("script");
    script.id = "script-traduction";
    script.src = "https://translate.google.com/translate_a/element.js?cb=initTraduction";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, [ouvert]);

  const choisir = (code: string) => {
    setOuvert(false);
    if (code === langue) return;
    poserCookie(code === "fr" ? null : `/fr/${code}`);
    window.location.reload();
  };

  return (
    <div ref={zone} className={`${styles.zone} notranslate`} translate="no">
      <div id="traduction-google" className={styles.cache} />

      {ouvert && (
        <ul className={styles.menu} role="menu">
          {LANGUES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={l.code === langue}
                className={l.code === langue ? styles.choisie : undefined}
                onClick={() => choisir(l.code)}
              >
                {l.nom}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className={styles.bouton}
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-label="Changer de langue"
        title="Changer de langue"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" />
          <ellipse cx="12" cy="12" rx="4.2" ry="9.5" />
          <line x1="2.5" y1="12" x2="21.5" y2="12" />
        </svg>
        {langue !== "fr" && <span className={styles.code}>{langue.toUpperCase()}</span>}
      </button>
    </div>
  );
}
