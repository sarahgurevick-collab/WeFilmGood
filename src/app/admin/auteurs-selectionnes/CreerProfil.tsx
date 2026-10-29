"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import formStyles from "@/components/form.module.css";
import { creerProfilAuteur, poserPhotoAuteur, poserSiteAuteur } from "./actions";

export type FicheProposee = {
  titre: string;
  /** « 2013 · Festival de Cannes », une par sélection du projet. */
  lignes: string[];
  /** Libellés de project_selections (« Cannes 2013 »). */
  selections: string[];
};

const petitChamp = { fontSize: 13, padding: "4px 6px", minWidth: 150 } as const;

/**
 * Une ligne de l'onglet : prénom, nom (préremplis, à corriger), adresse,
 * téléphone ; puis, pour chaque projet sélectionné, son titre (prérempli,
 * à corriger) et son lien Vimeo facultatif ; enfin le bouton.
 */
export default function CreerProfil({
  prenom,
  nom,
  email = "",
  fiches,
  dejaCree,
}: {
  prenom: string;
  nom: string;
  /** Adresse retrouvée par Sarah (table adresses_auteurs_selectionnes). */
  email?: string;
  fiches: FicheProposee[];
  /** Profil déjà créé depuis cet onglet : il reste là pour poser la photo. */
  dejaCree?: { id: string; nom: string; avatar: string | null; site: string | null };
}) {
  const [champs, setChamps] = useState({ prenom, nom, email, telephone: "", site: dejaCree?.site ?? "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [avatar, setAvatar] = useState<string | null>(dejaCree?.avatar ?? null);
  const [videos, setVideos] = useState(fiches.map((f) => ({ titre: f.titre, vimeo: "", langue: "fr" as "fr" | "en" })));
  const [siteEnregistre, setSiteEnregistre] = useState(dejaCree?.site ?? "");
  const [cree, setCree] = useState<string | null>(dejaCree?.id ?? null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const champ = (cle: keyof typeof champs, libelle: string, type = "text", requis = false) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12 }}>
      {libelle}
      <input
        type={type}
        value={champs[cle]}
        required={requis}
        onChange={(e) => setChamps({ ...champs, [cle]: e.target.value })}
        style={petitChamp}
      />
    </label>
  );

  const champVideo = (i: number, cle: "titre" | "vimeo", libelle: string, largeur: number) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12 }}>
      {libelle}
      <input
        type="text"
        value={videos[i][cle]}
        onChange={(e) => setVideos(videos.map((v, j) => (j === i ? { ...v, [cle]: e.target.value } : v)))}
        style={{ ...petitChamp, minWidth: largeur }}
      />
    </label>
  );

  const envoyerPhoto = async (id: string, fichier: File) => {
    const donnees = new FormData();
    donnees.set("profile_id", id);
    donnees.set("photo", fichier);
    const r = await poserPhotoAuteur(donnees);
    if ("url" in r) {
      setAvatar(r.url);
      setErreur(null);
    } else setErreur(r.erreur);
  };

  const champPhoto = (surChoix?: (f: File) => void) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12 }}>
      Photo de profil (facultatif)
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setPhoto(f);
          if (f && surChoix) surChoix(f);
        }}
        style={{ fontSize: 12 }}
      />
    </label>
  );

  if (cree) {
    return (
      <td style={{ paddingTop: 10, paddingBottom: 10 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          {avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" width={48} height={48} style={{ borderRadius: "50%", objectFit: "cover" }} />
          )}
          <strong style={{ fontSize: 14 }}>{dejaCree?.nom ?? `${champs.prenom} ${champs.nom}`.trim()}</strong>
          <Link href={`/membres/${cree}`} className={formStyles.hint} style={{ textDecoration: "underline" }}>
            Profil créé
          </Link>
          {champPhoto((f) => demarrer(() => envoyerPhoto(cree, f)))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              demarrer(async () => {
                const r = await poserSiteAuteur(cree, champs.site);
                if ("site" in r) {
                  setChamps({ ...champs, site: r.site });
                  setSiteEnregistre(r.site);
                  setErreur(null);
                } else setErreur(r.erreur);
              });
            }}
            style={{ display: "flex", alignItems: "flex-end", gap: 6 }}
          >
            {champ("site", "Site internet pro (facultatif)", "text")}
            {champs.site.trim() !== siteEnregistre && (
              <button type="submit" disabled={enCours} className={formStyles.submit} style={{ padding: "4px 10px", fontSize: 12 }}>
                Enregistrer
              </button>
            )}
          </form>
          {enCours && <span className={formStyles.hint}>…</span>}
        </div>
        {erreur && <span className={formStyles.error} style={{ fontSize: 12 }}>{erreur}</span>}
      </td>
    );
  }

  return (
    <td style={{ paddingTop: 14, paddingBottom: 14 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          demarrer(async () => {
            const r = await creerProfilAuteur({
              ...champs,
              fiches: fiches.map((f, i) => ({ selections: f.selections, ...videos[i] })),
            });
            if ("id" in r) {
              if (photo) await envoyerPhoto(r.id, photo);
              setCree(r.id);
            } else setErreur(r.erreur);
          });
        }}
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8 }}>
          {champ("prenom", "Prénom", "text", true)}
          {champ("nom", "Nom")}
          {champ("email", "Adresse email (facultatif)", "email")}
          {champ("telephone", "Téléphone (facultatif)", "tel")}
          {champ("site", "Site internet pro (facultatif)", "text")}
          {champPhoto()}
        </div>
        {fiches.map((f, i) => (
          <div key={f.titre} style={{ borderLeft: "3px solid #da2c25", paddingLeft: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>{f.lignes.join(" ; ")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8 }}>
              {champVideo(i, "titre", "Titre du projet", 240)}
              {champVideo(i, "vimeo", "Lien Vimeo du videopitch (facultatif)", 240)}
              <select
                value={videos[i].langue}
                onChange={(e) =>
                  setVideos(videos.map((v, j) => (j === i ? { ...v, langue: e.target.value as "fr" | "en" } : v)))
                }
                style={{ fontSize: 13, padding: "4px 6px" }}
              >
                <option value="fr">Français</option>
                <option value="en">Anglais</option>
              </select>
            </div>
          </div>
        ))}
        <div>
          <button type="submit" disabled={enCours} className={formStyles.submit} style={{ padding: "6px 12px", fontSize: 13 }}>
            Créer le profil
          </button>
        </div>
        {erreur && <span className={formStyles.error} style={{ fontSize: 12 }}>{erreur}</span>}
      </form>
    </td>
  );
}
