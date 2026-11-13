"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ChampFichier from "@/components/ChampFichier";
import formStyles from "@/components/form.module.css";
import { envoyerVideoParMorceaux } from "@/lib/envoi-video";

const TAILLE_MAX = 2 * 1024 * 1024 * 1024;
const ACCEPT = "video/*,.mp4,.mov,.m4v,.avi,.mkv,.webm,.mpg,.mpeg,.wmv,.3gp,.mts,.m2ts";

/**
 * L'envoi d'un ComedyPitch (13/11/2026) : le même que celui du videopitch
 * de l'auteur, pour un personnage. Tous les textes ont été validés par
 * Sarah le 12/11.
 */
export default function EnvoiComedyPitch({ personnageId, remplace }: { personnageId: string; remplace: boolean }) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [nom, setNom] = useState<string | null>(null);
  const [phase, setPhase] = useState<"repos" | "envoi" | "fini">("repos");
  const [progres, setProgres] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);

  // Quitter la page en plein envoi perdrait la vidéo : le navigateur prévient.
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
      setErreur("La vidéo dépasse 2 Go. Exportez-la en plus petit avant de l'envoyer.");
      return;
    }
    setErreur(null);
    setPhase("envoi");
    setProgres(0);
    try {
      await envoyerVideoParMorceaux(fichier, { personnage_id: personnageId }, setProgres);
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
        ✓ Vidéo envoyée. Nous la regardons avant de la mettre en ligne.
      </p>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <label className={formStyles.field} style={{ marginTop: 10 }}>
        <span>{remplace ? "Remplacer la vidéo" : "Choisir la vidéo"}</span>
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
          Tel quel, sans la compresser : MP4, MOV, AVI, MKV ou WEBM, jusqu&apos;à 2 Go. Nous la réduisons nous-mêmes
          pour la lecture sur le site.
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
            Envoi de {nom ?? "la vidéo"} : {Math.round(progres * 100)} %. Ne fermez pas cette page.
          </p>
        </div>
      ) : (
        <button type="button" className={formStyles.submit} style={{ marginTop: 12 }} onClick={envoyer} disabled={!nom}>
          Envoyer la vidéo
        </button>
      )}
    </div>
  );
}
