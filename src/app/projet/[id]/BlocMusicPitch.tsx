"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Etoiles } from "./BlocComedyPitch";
import styles from "./comedypitch.module.css";

export type MusicPitchFiche = {
  id: string;
  prenom: string;
  /** Lien d'écoute temporaire. */
  url: string;
  /** La photo du compositeur (déjà nette ou floutée selon qui regarde), ou null. */
  photo: string | null;
  /** « 2 min 14 s », ou null. */
  duree: string | null;
  /** Le profil du compositeur ; absent sur son propre profil. */
  profil?: string;
  etoiles: number;
  donnee: boolean;
  peutEtoiler: boolean;
  /** Sur le profil du compositeur : le titre du projet, écrit derrière le prénom. */
  projet?: string;
};

/**
 * La liste d'écoute des MusicPitchs (24/11/2026, maquette validée par
 * Sarah) : une ligne par morceau — bouton lecture, photo ronde du
 * compositeur, prénom, durée, « Voir son profil », étoile. Un seul morceau
 * joue à la fois ; à la fin, le suivant démarre. Sur la fiche, l'ordre
 * change chaque jour (côté serveur). Sert aussi sur le profil du
 * compositeur. Avant : un lecteur du navigateur par morceau (étiquette
 * musicpitch-avant-liste-ecoute).
 */
export default function BlocMusicPitch({
  sons,
  deposer,
  tournant = false,
}: {
  sons: MusicPitchFiche[];
  deposer: string | null;
  /** Dit que l'ordre change chaque jour (sur la fiche, à partir de deux morceaux). */
  tournant?: boolean;
}) {
  const lecteur = useRef<HTMLAudioElement>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [joue, setJoue] = useState(false);
  const [avance, setAvance] = useState(0);

  // Le morceau choisi se charge et part ; changer de morceau arrête l'autre.
  useEffect(() => {
    const audio = lecteur.current;
    const son = sons.find((s) => s.id === enCours);
    if (!audio || !son) return;
    if (audio.getAttribute("src") !== son.url) {
      audio.src = son.url;
      setAvance(0);
    }
    audio.play().catch(() => setJoue(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enCours]);

  if (sons.length === 0 && !deposer) return null;

  function basculer(id: string) {
    const audio = lecteur.current;
    if (!audio) return;
    if (enCours !== id) {
      setEnCours(id);
      return;
    }
    if (audio.paused) audio.play().catch(() => setJoue(false));
    else audio.pause();
  }

  function suivant() {
    const i = sons.findIndex((s) => s.id === enCours);
    const prochain = sons[i + 1];
    setJoue(false);
    setAvance(0);
    setEnCours(prochain ? prochain.id : null);
  }

  // Un clic sur la barre du morceau en cours déplace la lecture.
  function deplacer(e: React.MouseEvent<HTMLDivElement>) {
    const audio = lecteur.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const cadre = e.currentTarget.getBoundingClientRect();
    audio.currentTime = Math.min(1, Math.max(0, (e.clientX - cadre.left) / cadre.width)) * audio.duration;
  }

  return (
    <div className={styles.bloc}>
      {sons.length > 0 && (
        <div>
          <p className={styles.ecouteEntete}>
            <span className={styles.ecouteTitre}>
              MusicPitch <span className={styles.ecouteNombre}>· {sons.length}</span>
            </span>
            {tournant && sons.length > 1 && <span className={styles.ecouteNote}>L&apos;ordre change chaque jour</span>}
          </p>
          <audio
            ref={lecteur}
            preload="none"
            onPlay={() => setJoue(true)}
            onPause={() => setJoue(false)}
            onEnded={suivant}
            onTimeUpdate={(e) => {
              const a = e.currentTarget;
              setAvance(Number.isFinite(a.duration) && a.duration > 0 ? a.currentTime / a.duration : 0);
            }}
          />
          {sons.map((s) => {
            const actif = s.id === enCours;
            const portrait = (
              <span className={styles.ecoutePhoto}>
                {s.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photo} alt="" />
                ) : (
                  s.prenom.trim().charAt(0).toUpperCase()
                )}
              </span>
            );
            return (
              <div key={s.id} className={`${styles.ecouteLigne} ${actif ? styles.ecouteActive : ""}`}>
                <button
                  type="button"
                  className={styles.ecouteLecture}
                  onClick={() => basculer(s.id)}
                  aria-label={`${actif && joue ? "Mettre en pause" : "Écouter"} le MusicPitch de ${s.prenom}`}
                >
                  {actif && joue ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
                      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <path d="M8 5v14l11-7z" fill="currentColor" />
                    </svg>
                  )}
                </button>
                {s.profil ? (
                  <Link href={s.profil} aria-hidden="true" tabIndex={-1}>
                    {portrait}
                  </Link>
                ) : (
                  portrait
                )}
                <div className={styles.ecouteTexte}>
                  <p className={styles.titre} style={{ margin: 0 }}>
                    MusicPitch de {s.prenom}
                    {s.projet ? ` · ${s.projet}` : ""}
                  </p>
                  {(s.duree || s.profil) && (
                    <p className={styles.ecouteInfos}>
                      {s.duree}
                      {s.duree && s.profil ? " · " : ""}
                      {s.profil && <Link href={s.profil}>Voir son profil</Link>}
                    </p>
                  )}
                  <div className={styles.ecouteBarre} onClick={actif ? deplacer : undefined} style={actif ? { cursor: "pointer" } : undefined}>
                    <div style={{ width: `${actif ? Math.round(avance * 1000) / 10 : 0}%` }} />
                  </div>
                </div>
                <Etoiles video={s} />
              </div>
            );
          })}
        </div>
      )}
      {deposer && (
        <Link href={deposer} className={styles.deposer}>
          Déposer mon MusicPitch
        </Link>
      )}
    </div>
  );
}
