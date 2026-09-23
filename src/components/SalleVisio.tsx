"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./SalleVisio.module.css";

export type RoleVisio = "public" | "intervenant" | "regie";

type JitsiApi = {
  addListener: (evenement: string, rappel: (donnees: Record<string, unknown>) => void) => void;
  executeCommand: (commande: string, ...args: unknown[]) => void;
  dispose: () => void;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domaine: string, options: Record<string, unknown>) => JitsiApi;
  }
}

const DOMAINE = "meet.wefilmgood.com";

const BOUTONS: Record<RoleVisio, string[]> = {
  // Le public n'a ni micro ni caméra : il regarde, en plein écran s'il veut.
  public: ["fullscreen"],
  intervenant: ["microphone", "camera", "desktop", "tileview", "fullscreen", "settings", "hangup"],
  regie: [
    "microphone",
    "camera",
    "desktop",
    "tileview",
    "participants-pane",
    "fullscreen",
    "settings",
    "hangup",
  ],
};

function chargerScript(): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  return new Promise((ok, echec) => {
    const s = document.createElement("script");
    s.src = `https://${DOMAINE}/external_api.js`;
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => echec(new Error("Visio injoignable"));
    document.head.appendChild(s);
  });
}

/**
 * La salle Jitsi, intégrée à la page. Le rôle décide des boutons : le
 * public n'a aucun moyen d'ouvrir son micro ou sa caméra. En plus, dès
 * qu'un intervenant ou la régie entre, la modération est activée côté
 * serveur : même en bidouillant, le public ne peut plus se faire entendre.
 */
export default function SalleVisio({
  salle,
  jwt,
  role,
  titre,
}: {
  salle: string;
  jwt: string;
  role: RoleVisio;
  titre: string;
}) {
  const conteneur = useRef<HTMLDivElement>(null);
  const api = useRef<JitsiApi | null>(null);
  const [erreur, setErreur] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);

  useEffect(() => {
    let annule = false;
    chargerScript()
      .then(() => {
        if (annule || !conteneur.current || !window.JitsiMeetExternalAPI) return;
        const publicMuet = role === "public";
        const instance = new window.JitsiMeetExternalAPI(DOMAINE, {
          roomName: salle,
          jwt,
          parentNode: conteneur.current,
          width: "100%",
          height: "100%",
          lang: "fr",
          configOverwrite: {
            subject: titre,
            prejoinConfig: { enabled: false },
            disableDeepLinking: true,
            startWithAudioMuted: publicMuet,
            startWithVideoMuted: publicMuet,
            disableSelfView: publicMuet,
            disableShortcuts: publicMuet,
            disableReactions: true,
            disableInviteFunctions: true,
            hideConferenceTimer: false,
            toolbarButtons: BOUTONS[role],
            filmstrip: { disabled: publicMuet },
            // Pas de discussion dans Jitsi (aucun bouton « chat ») : les
            // questions passent par le panneau du site, que la régie trie.
            // Le public ne reçoit aucune notification de la salle.
            ...(publicMuet ? { notifications: [] } : {}),
          },
        });
        api.current = instance;

        if (role !== "public") {
          instance.addListener("videoConferenceJoined", () => {
            instance.executeCommand("toggleModeration", true, "audio");
            instance.executeCommand("toggleModeration", true, "video");
          });
        }
        instance.addListener("recordingStatusChanged", (d) => {
          setEnregistrement(Boolean(d.on));
        });
      })
      .catch(() => setErreur(true));

    return () => {
      annule = true;
      api.current?.dispose();
      api.current = null;
    };
  }, [salle, jwt, role, titre]);

  return (
    <div className={styles.cadre}>
      {role === "regie" && (
        <div className={styles.barreRegie}>
          <span className={enregistrement ? styles.enregistre : styles.pasEnregistre}>
            {enregistrement ? "● Enregistrement en cours" : "Pas d'enregistrement"}
          </span>
          <button
            type="button"
            className={styles.bouton}
            onClick={() =>
              enregistrement
                ? api.current?.executeCommand("stopRecording", "file")
                : api.current?.executeCommand("startRecording", { mode: "file" })
            }
          >
            {enregistrement ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
          </button>
        </div>
      )}
      {erreur ? (
        <p className={styles.erreur}>
          La visio ne répond pas. Rechargez la page dans un instant ; si le problème continue,
          prévenez WeFilmGood.
        </p>
      ) : (
        <div ref={conteneur} className={styles.ecran} />
      )}
    </div>
  );
}
