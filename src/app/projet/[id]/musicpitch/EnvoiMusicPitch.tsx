"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ChampFichier from "@/components/ChampFichier";
import formStyles from "@/components/form.module.css";
import { envoyerVideoParMorceaux } from "@/lib/envoi-video";

const TAILLE_MAX = 500 * 1024 * 1024;
const ACCEPT = "audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,.oga,.opus,.aif,.aiff,.wma";

/**
 * L'envoi d'un MusicPitch (23/11/2026) : le même que celui du ComedyPitch,
 * avec un fichier son, pour un projet. Textes repris de ceux du ComedyPitch
 * (validés le 12/11), adaptés au son : À FAIRE VALIDER par Sarah.
 */
export default function EnvoiMusicPitch({ projectId, remplace }: { projectId: string; remplace: boolean }) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [nom, setNom] = useState<string | null>(null);
  const [phase, setPhase] = useState<"repos" | "envoi" | "fini">("repos");
  const [progres, setProgres] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);

  // Quitter la page en plein envoi perdrait le fichier : le navigateur prévient.
  useEffect(() => {
    if (phase !== "envoi") return;
    const garde = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", garde);
    return () => window.removeEventListener("beforeunload", garde);
  }, [phase]);

  async function envoyer() {
    const fichier = champ.current?.files?.[0];
    if (!fichier) return;
    if (fichier.size > TAILLE_MAX) {
      setErreur("Le fichier dépasse 500 Mo. Exportez-le en plus petit avant de l'envoyer.");
      return;
    }
    setErreur(null);
    setPhase("envoi");
    setProgres(0);
    try {
      await envoyerVideoParMorceaux(fichier, { project_id: projectId, genre: "musicpitch" }, setProgres);
      setPhase("fini");
      router.refresh();
    } catch (e) {
      setPhase("repos");
      setErreur(e instanceof Error ? e.message : "L'envoi a échoué. Réessayez.");
    }
  }

  if (phase === "fini") {
    return (
      <p className={formStyles.hint} style={{ color: "#1a1a1a" }}>
        ✓ Fichier envoyé. Nous l&apos;écoutons avant de le mettre en ligne.
      </p>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <label className={formStyles.field} style={{ marginTop: 10 }}>
        <span>{remplace ? "Remplacer le fichier son" : "Choisir le fichier son"}</span>
        <ChampFichier
          ref={champ}
          accept={ACCEPT}
          disabled={phase === "envoi"}
          onChange={(e) => {
            setNom(e.target.files?.[0]?.name ?? null);
            setErreur(null);
          }}
        />
        <span className={formStyles.hint}>
          Tel quel, sans le compresser : MP3, WAV, M4A, AAC, FLAC ou OGG, jusqu&apos;à 500 Mo. Nous le préparons
          nous-mêmes pour l&apos;écoute sur le site.
        </span>
      </label>
      {erreur && <p className={formStyles.error}>{erreur}</p>}
      {phase === "envoi" ? (
        <div style={{ marginTop: 10 }}>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progres * 100)}
            style={{ height: 8, borderRadius: 4, background: "#e6e6e6", overflow: "hidden" }}
          >
            <div style={{ width: `${Math.round(progres * 100)}%`, height: "100%", background: "#DA2C25", transition: "width .3s" }} />
          </div>
          <p className={formStyles.hint} style={{ marginTop: 6 }}>
            Envoi de {nom ?? "votre fichier"} : {Math.round(progres * 100)} %. Ne fermez pas cette page.
          </p>
        </div>
      ) : (
        <button type="button" className={formStyles.submit} style={{ marginTop: 12 }} onClick={envoyer} disabled={!nom}>
          Envoyer le fichier son
        </button>
      )}
    </div>
  );
}
