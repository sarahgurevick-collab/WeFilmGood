"use client";

import { useEffect, useState } from "react";
import styles from "./InviterInstallation.module.css";

/**
 * Sur téléphone, une fois connecté : une fenêtre invite à installer
 * WeFilmGood sur l'écran d'accueil. Une application sur l'écran
 * d'accueil, c'est une raison de revenir chaque semaine — l'objectif.
 *
 *  - Android (Chrome, Edge, Samsung) : le navigateur propose lui-même
 *    l'installation ; notre bouton « Installer » la déclenche.
 *  - iPhone et iPad : aucune installation automatique n'existe ; la
 *    fenêtre montre les deux gestes (Partager, puis « Sur l'écran
 *    d'accueil »).
 *
 * Jamais sur ordinateur, jamais une fois l'application installée, et
 * pas deux fois : « Plus tard » la fait taire trente jours sur ce
 * téléphone.
 */
const CLE = "wfg-installation-plus-tard";
const DELAI_JOURS = 30;

type EvenementInstallation = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function dejaInstallee() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function surTelephone() {
  return window.matchMedia("(pointer: coarse) and (max-width: 900px)").matches;
}

function connecte() {
  return /(?:^|;\s*)sb-[^=]*-auth-token/.test(document.cookie);
}

function mise_en_sourdine() {
  try {
    const t = Number(localStorage.getItem(CLE));
    return t > 0 && Date.now() - t < DELAI_JOURS * 24 * 3600 * 1000;
  } catch {
    return false;
  }
}

export default function InviterInstallation() {
  const [android, setAndroid] = useState<EvenementInstallation | null>(null);
  const [visible, setVisible] = useState<"android" | "ios" | null>(null);

  useEffect(() => {
    if (!surTelephone() || dejaInstallee() || mise_en_sourdine()) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    let minuteur: ReturnType<typeof setTimeout> | null = null;

    // Laisser la page s'afficher avant d'inviter : trois secondes.
    const montrer = (type: "android" | "ios") => {
      minuteur = setTimeout(() => {
        if (connecte()) setVisible(type);
      }, 3000);
    };

    const surProposition = (e: Event) => {
      e.preventDefault(); // on remplace la bannière du navigateur par la nôtre
      setAndroid(e as EvenementInstallation);
      montrer("android");
    };

    if (ios) montrer("ios");
    else window.addEventListener("beforeinstallprompt", surProposition);

    const installee = () => setVisible(null);
    window.addEventListener("appinstalled", installee);

    return () => {
      if (minuteur) clearTimeout(minuteur);
      window.removeEventListener("beforeinstallprompt", surProposition);
      window.removeEventListener("appinstalled", installee);
    };
  }, []);

  const plusTard = () => {
    try {
      localStorage.setItem(CLE, String(Date.now()));
    } catch {
      // Stockage refusé : la fenêtre reviendra à la prochaine visite.
    }
    setVisible(null);
  };

  const installer = async () => {
    if (!android) return;
    await android.prompt();
    const { outcome } = await android.userChoice;
    setAndroid(null);
    if (outcome === "accepted") setVisible(null);
    else plusTard();
  };

  if (!visible) return null;

  return (
    <div className={styles.fenetre} role="dialog" aria-labelledby="installer-titre">
      <button type="button" className={styles.fermer} onClick={plusTard} aria-label="Fermer">
        ⊖
      </button>

      <div className={styles.entete}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icone-192.png" alt="" width={56} height={56} className={styles.icone} />
        <div>
          <p id="installer-titre" className={styles.titre}>
            Installez WeFilmGood
          </p>
          <p className={styles.texte}>
            Sur votre écran d&apos;accueil, comme une application : un geste pour retrouver
            la pitchothèque, vos projets et vos messages.
          </p>
        </div>
      </div>

      {visible === "android" ? (
        <div className={styles.actions}>
          <button type="button" className={styles.secondaire} onClick={plusTard}>
            Plus tard
          </button>
          <button type="button" className={styles.principal} onClick={installer}>
            Installer
          </button>
        </div>
      ) : (
        <>
          <ol className={styles.etapes}>
            <li>
              Touchez
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="le bouton Partager">
                <path d="M12 3v12" />
                <polyline points="8 7 12 3 16 7" />
                <path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" />
              </svg>
              en bas de l&apos;écran (Partager).
            </li>
            <li>
              Choisissez <strong>« Sur l&apos;écran d&apos;accueil »</strong>.
            </li>
          </ol>
          <div className={styles.actions}>
            <button type="button" className={styles.secondaire} onClick={plusTard}>
              Plus tard
            </button>
          </div>
        </>
      )}
    </div>
  );
}
