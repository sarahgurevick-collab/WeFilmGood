"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import formStyles from "@/components/form.module.css";

type Langue = "fr" | "en";
export type DepotAffiche = {
  langue: Langue;
  etat: string;
  nom_origine: string | null;
  motif_refus: string | null;
  cree_le: string;
};

const TAILLE_MAX = 2 * 1024 * 1024 * 1024;
const ACCEPT = "video/*,.mp4,.mov,.m4v,.avi,.mkv,.webm,.mpg,.mpeg,.wmv,.3gp,.mts,.m2ts";

/**
 * L'envoi du videopitch depuis le bloc Documents (22/10/2026). La vidéo
 * part telle quelle, par morceaux de 8 Mo — une connexion qui saute
 * reprend au morceau suivant —, puis le serveur l'allège et l'équipe la
 * regarde avant de la mettre en ligne. Rien à compresser côté auteur.
 */
export default function EnvoiVideopitch({
  projectId,
  enLigne,
  depots,
}: {
  projectId: string;
  /** Les versions déjà en ligne sur la fiche (Vimeo). */
  enLigne: { fr: boolean; en: boolean };
  /** Les dépôts en cours ou terminés, un par langue au plus. */
  depots: DepotAffiche[];
}) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [langue, setLangue] = useState<Langue>(enLigne.fr && !enLigne.en ? "en" : "fr");
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
    if (!fichier) {
      setErreur("Choisissez d'abord une vidéo.");
      return;
    }
    if (fichier.size > TAILLE_MAX) {
      setErreur("La vidéo dépasse 2 Go. Exportez-la en plus petit avant de l'envoyer.");
      return;
    }
    setErreur(null);
    setPhase("envoi");
    setProgres(0);
    try {
      const ouverture = await fetch("/api/videopitch/depots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, langue, nom: fichier.name, taille: fichier.size, type: fichier.type }),
      });
      const infos = (await ouverture.json().catch(() => ({}))) as { id?: string; morceau?: number; erreur?: string };
      if (!ouverture.ok || !infos.id) throw new Error(infos.erreur ?? "Le dépôt n'a pas pu commencer.");
      const taille = infos.morceau ?? 8 * 1024 * 1024;

      let decalage = 0;
      let essais = 0;
      while (decalage < fichier.size) {
        const tranche = fichier.slice(decalage, Math.min(decalage + taille, fichier.size));
        try {
          const reponse = await fetch(`/api/videopitch/depots/${infos.id}/morceau`, {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream", "x-decalage": String(decalage) },
            body: tranche,
          });
          const corps = (await reponse.json().catch(() => ({}))) as { recu?: number; erreur?: string };
          if (reponse.status === 409 && typeof corps.recu === "number") {
            decalage = corps.recu; // le serveur dit où il en est, on reprend de là
            continue;
          }
          if (!reponse.ok || typeof corps.recu !== "number") throw new Error(corps.erreur ?? "Envoi interrompu.");
          decalage = corps.recu;
          essais = 0;
        } catch (e) {
          // Une coupure réseau : on réessaie le même morceau, un peu plus tard.
          if (++essais > 6) throw e instanceof Error ? e : new Error("Envoi interrompu.");
          await new Promise((r) => setTimeout(r, 1500 * essais));
          continue;
        }
        setProgres(decalage / fichier.size);
      }

      const fin = await fetch(`/api/videopitch/depots/${infos.id}/terminer`, { method: "POST" });
      const resultat = (await fin.json().catch(() => ({}))) as { etat?: string; erreur?: string };
      if (!fin.ok) throw new Error(resultat.erreur ?? "La fin de l'envoi a échoué.");
      setPhase("fini");
      router.refresh();
    } catch (e) {
      setPhase("repos");
      setErreur(e instanceof Error ? e.message : "L'envoi a échoué. Réessayez.");
    }
  }

  const etatLisible = (d: DepotAffiche) => {
    switch (d.etat) {
      case "envoi":
        return "Envoi interrompu avant la fin. Vous pouvez recommencer.";
      case "recu":
      case "preparation":
        return "Vidéo reçue. Nous la préparons pour la lecture en ligne : cela prend quelques minutes.";
      case "a_valider":
        return "Votre videopitch est entre les mains de l'équipe, qui le regarde avant de le mettre en ligne. Vous recevrez un e-mail.";
      case "refuse":
        return `Votre videopitch n'a pas été retenu${d.motif_refus ? ` : ${d.motif_refus}` : "."} Vous pouvez en envoyer un autre.`;
      case "echec":
        return "Nous n'avons pas réussi à lire cette vidéo. Réessayez avec un autre fichier, en MP4 de préférence.";
      default:
        return null;
    }
  };

  const libelleLangue = (l: Langue) => (l === "fr" ? "en français" : "en anglais");

  return (
    <div style={{ marginTop: 8 }}>
      {(["fr", "en"] as Langue[]).map((l) => {
        const d = depots.find((x) => x.langue === l);
        if (enLigne[l] && (!d || d.etat === "valide")) {
          return (
            <p key={l} className={formStyles.hint} style={{ color: "#1a1a1a" }}>
              ✓ Votre videopitch {libelleLangue(l)} est en ligne sur votre fiche.{" "}
              <Link href={`/projet/${projectId}`}>Le voir</Link>
            </p>
          );
        }
        if (!d || d.etat === "valide") return null;
        const texte = etatLisible(d);
        return texte ? (
          <p key={l} className={formStyles.hint} style={{ color: "#1a1a1a" }}>
            <strong>Version {libelleLangue(l)}</strong>
            {d.nom_origine ? ` (${d.nom_origine})` : ""} — {texte}
          </p>
        ) : null;
      })}

      {phase === "fini" ? (
        <p className={formStyles.hint} style={{ color: "#1a1a1a" }}>
          ✓ Vidéo envoyée. Nous la préparons, puis l&apos;équipe la regarde avant de la mettre en
          ligne. Vous recevrez un e-mail à chaque étape.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 10, fontSize: 14 }}>
            {(["fr", "en"] as Langue[]).map((l) => (
              <label key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="radio"
                  name="videopitch_langue"
                  value={l}
                  checked={langue === l}
                  disabled={phase === "envoi"}
                  onChange={() => setLangue(l)}
                />
                Version {libelleLangue(l)}
              </label>
            ))}
          </div>
          <label className={formStyles.field} style={{ marginTop: 10 }}>
            <span>{enLigne[langue] || depots.some((d) => d.langue === langue) ? "Remplacer la vidéo" : "Choisir la vidéo"}</span>
            <input
              ref={champ}
              type="file"
              accept={ACCEPT}
              disabled={phase === "envoi"}
              onChange={(e) => {
                setNom(e.target.files?.[0]?.name ?? null);
                setErreur(null);
              }}
            />
            <span className={formStyles.hint}>
              Tel quel, sans la compresser : MP4, MOV, AVI, MKV ou WEBM, jusqu&apos;à 2 Go. Nous la
              réduisons nous-mêmes pour la lecture sur le site.
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
        </>
      )}
    </div>
  );
}
