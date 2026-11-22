"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import formStyles from "@/components/form.module.css";
import { reduireImage } from "@/components/ChampFichier";
import { ajouterPhotoMoodboard } from "./actions";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Zone de dépôt du Moodboard (22/11) : on glisse les photos dessus, ou on
 * clique pour les choisir. Chaque photo est allégée puis envoyée seule, et
 * enregistrée aussitôt — plus besoin du bouton « Enregistrer » pour elles.
 */
export default function ZoneMoodboard({ projectId }: { projectId: string }) {
  const routeur = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);
  const [fait, setFait] = useState(0);
  const [total, setTotal] = useState(0);
  const [refusees, setRefusees] = useState<string[]>([]);
  const enCours = total > 0 && fait < total;

  async function envoyer(liste: File[]) {
    const images = liste.filter((f) => TYPES.includes(f.type));
    const ignorees = liste.filter((f) => !TYPES.includes(f.type)).map((f) => f.name);
    if (!images.length) {
      setRefusees(ignorees);
      return;
    }
    setRefusees(ignorees);
    setFait(0);
    setTotal(images.length);
    let suivante = 0;
    const echecs: string[] = [...ignorees];
    const ouvrier = async () => {
      while (suivante < images.length) {
        const f = images[suivante++];
        try {
          const legere = await reduireImage(f);
          const donnees = new FormData();
          donnees.set("project_id", projectId);
          donnees.set("photo", legere);
          const r = await ajouterPhotoMoodboard(donnees);
          if (!r.ok) echecs.push(f.name);
        } catch {
          echecs.push(f.name);
        }
        setFait((n) => n + 1);
      }
    };
    await Promise.all([ouvrier(), ouvrier(), ouvrier()]);
    setRefusees(echecs);
    routeur.refresh();
    setTotal(0);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => champ.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && champ.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          void envoyer(Array.from(e.dataTransfer.files));
        }}
        style={{
          border: `2px dashed ${survol ? "#DA2C25" : "#777"}`,
          borderRadius: 12,
          padding: "28px 16px",
          textAlign: "center",
          cursor: "pointer",
          background: survol ? "rgba(218,44,37,0.08)" : "transparent",
        }}
      >
        {enCours ? `Envoi des photos : ${fait} sur ${total}…` : "Glissez vos photos ici, ou cliquez pour les choisir"}
      </div>
      <input
        ref={champ}
        type="file"
        multiple
        accept={TYPES.join(",")}
        style={{ display: "none" }}
        onChange={(e) => {
          const liste = Array.from(e.target.files ?? []);
          e.target.value = "";
          void envoyer(liste);
        }}
      />
      {refusees.length > 0 && !enCours && (
        <p className={formStyles.hint}>Pas enregistrées : {refusees.join(", ")}.</p>
      )}
    </div>
  );
}
