"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import formStyles from "@/components/form.module.css";
import { reduireImage } from "@/components/ChampFichier";
import { ajouterPhotoMoodboard } from "./actions";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const PAGES_MAX = 40;

/** Un PDF devient une image par page (JPEG, 1600 px de large), lue dans le navigateur. */
async function pagesDuPdf(pdf: File): Promise<File[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: await pdf.arrayBuffer() }).promise;
  const base = pdf.name.replace(/\.pdf$/i, "");
  const sortie: File[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, PAGES_MAX); n++) {
    const page = await doc.getPage(n);
    const v0 = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(3, 1600 / v0.width) });
    const c = document.createElement("canvas");
    c.width = Math.round(viewport.width);
    c.height = Math.round(viewport.height);
    const ctx = c.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvas: c, canvasContext: ctx, viewport }).promise;
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
    if (blob) sortie.push(new File([blob], `${base}-page-${n}.jpg`, { type: "image/jpeg" }));
  }
  return sortie;
}

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
  const [lecture, setLecture] = useState(false);
  const [refusees, setRefusees] = useState<string[]>([]);
  const enCours = lecture || (total > 0 && fait < total);

  async function envoyer(brut: File[]) {
    const ignorees: string[] = [];
    const liste: File[] = [];
    const estPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    if (brut.some(estPdf)) setLecture(true);
    for (const f of brut) {
      if (!estPdf(f)) {
        liste.push(f);
        continue;
      }
      try {
        const pages = await pagesDuPdf(f);
        if (pages.length) liste.push(...pages);
        else ignorees.push(f.name);
      } catch {
        ignorees.push(f.name);
      }
    }
    setLecture(false);
    const images = liste.filter((f) => TYPES.includes(f.type));
    ignorees.push(...liste.filter((f) => !TYPES.includes(f.type)).map((f) => f.name));
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
        {lecture ? "Lecture du PDF…" : enCours ? `Envoi des photos : ${fait} sur ${total}…` : "Glissez vos photos ici, ou cliquez pour les choisir (JPG, PNG, WebP, AVIF ou PDF)"}
      </div>
      <input
        ref={champ}
        type="file"
        multiple
        accept={[...TYPES, "application/pdf"].join(",")}
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
