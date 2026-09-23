"use client";

import { useMemo, useState } from "react";
import adminStyles from "../admin.module.css";
import styles from "./fiches.module.css";

export type LigneFiche = {
  cle: string;
  date: string | null;
  lecteur: string | null;
  lecteurEmail: string | null;
  scenariste: string | null;
  titre: string | null;
  projetId: string | null;
  format: string | null;
  langue: string | null;
  statut: string;
  note: number | null;
  /** Début de l'analyse, en texte brut. */
  analyse: string;
  /** De 1 à 5, null quand l'auteur n'a pas noté. */
  satisfaction: number | null;
  /** Page de relecture, pour les fiches rendues sur le nouveau site. */
  lienFiche: string | null;
};

const FORMATS: Record<string, string> = {
  long_metrage: "LM",
  court_metrage: "CM",
  serie: "TV",
  immersif_360_vr: "VR",
};

type Colonne = "date" | "lecteur" | "scenariste" | "titre" | "format" | "statut" | "note" | "satisfaction";

const COLONNES: { cle: Colonne; libelle: string }[] = [
  { cle: "date", libelle: "Date" },
  { cle: "lecteur", libelle: "Lecteur" },
  { cle: "scenariste", libelle: "Scénariste" },
  { cle: "titre", libelle: "Titre" },
  { cle: "format", libelle: "Format" },
  { cle: "statut", libelle: "Statut" },
  { cle: "note", libelle: "Note" },
];

const formatCourt = (l: LigneFiche) => (l.format ? (FORMATS[l.format] ?? l.format) : "");

function valeur(l: LigneFiche, c: Colonne): string | number {
  switch (c) {
    case "format":
      return formatCourt(l);
    case "note":
      return l.note ?? -1;
    case "satisfaction":
      return l.satisfaction ?? -1;
    default:
      return (l[c] ?? "").toString().toLowerCase();
  }
}

const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function TableauFiches({ lignes }: { lignes: LigneFiche[] }) {
  const [recherche, setRecherche] = useState("");
  const [format, setFormat] = useState<string | null>(null);
  const [tri, setTri] = useState<{ colonne: Colonne; sens: 1 | -1 }>({ colonne: "date", sens: -1 });
  const [ouvertes, setOuvertes] = useState<Set<string>>(new Set());

  const affichees = useMemo(() => {
    const mots = sansAccents(recherche).split(/\s+/).filter(Boolean);
    const filtrees = lignes.filter((l) => {
      if (format && formatCourt(l) !== format) return false;
      if (mots.length === 0) return true;
      const texte = sansAccents(
        [l.lecteur, l.lecteurEmail, l.scenariste, l.titre, l.analyse, l.statut].join(" "),
      );
      return mots.every((m) => texte.includes(m));
    });
    const { colonne, sens } = tri;
    return filtrees.sort((a, b) => {
      const va = valeur(a, colonne);
      const vb = valeur(b, colonne);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sens;
    });
  }, [lignes, recherche, format, tri]);

  const trier = (colonne: Colonne) =>
    setTri((t) =>
      t.colonne === colonne
        ? { colonne, sens: t.sens === 1 ? -1 : 1 }
        : { colonne, sens: colonne === "date" || colonne === "note" || colonne === "satisfaction" ? -1 : 1 },
    );

  const basculer = (cle: string) =>
    setOuvertes((o) => {
      const n = new Set(o);
      if (n.has(cle)) n.delete(cle);
      else n.add(cle);
      return n;
    });

  const entete = (c: Colonne, libelle: string) => (
    <th key={c}>
      <button type="button" className={styles.tri} onClick={() => trier(c)}>
        {libelle}
        <span aria-hidden="true">{tri.colonne === c ? (tri.sens === 1 ? " ▲" : " ▼") : " ↕"}</span>
      </button>
    </th>
  );

  return (
    <>
      <div className={styles.outils}>
        <input
          type="search"
          className={styles.recherche}
          placeholder="Rechercher : lecteur, scénariste, titre, mot de l'analyse…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <div className={styles.formats}>
          {[null, "CM", "LM", "TV", "VR"].map((f) => (
            <button
              key={f ?? "tous"}
              type="button"
              className={format === f ? adminStyles.anneeActive : adminStyles.annee}
              onClick={() => setFormat(f)}
            >
              {f ?? "Tous formats"}
            </button>
          ))}
        </div>
      </div>

      <p className={styles.compte}>
        {affichees.length.toLocaleString("fr-FR")} fiche{affichees.length > 1 ? "s" : ""}
        {affichees.length !== lignes.length && ` sur ${lignes.length.toLocaleString("fr-FR")}`}
      </p>

      {affichees.length === 0 ? (
        <p className={styles.compte}>Aucune fiche.</p>
      ) : (
        <table className={`${adminStyles.table} ${styles.table}`}>
          <thead>
            <tr>
              {COLONNES.map(({ cle, libelle }) => entete(cle, libelle))}
              <th>Analyse</th>
              {entete("satisfaction", "Satisfaction de l'auteur")}
            </tr>
          </thead>
          <tbody>
            {affichees.map((l) => (
              <tr key={l.cle}>
                <td className={styles.date}>
                  {l.date ? new Date(l.date).toLocaleDateString("fr-FR") : "—"}
                </td>
                <td>
                  <strong>{l.lecteur ?? "—"}</strong>
                  {l.lecteurEmail && <span className={styles.email}>{l.lecteurEmail}</span>}
                </td>
                <td>{l.scenariste ?? "—"}</td>
                <td>
                  {l.projetId ? (
                    <a href={`/projet/${l.projetId}`} target="_blank" rel="noopener noreferrer">
                      {l.titre ?? "Sans titre"}
                    </a>
                  ) : (
                    (l.titre ?? "Projet supprimé")
                  )}
                </td>
                <td>{formatCourt(l) || "—"}</td>
                <td>
                  {l.lienFiche ? <a href={l.lienFiche}>{l.statut}</a> : l.statut}
                </td>
                <td className={styles.note}>{l.note != null ? `${l.note} / 200` : "—"}</td>
                <td className={styles.analyse}>
                  {l.analyse ? (
                    <button
                      type="button"
                      className={ouvertes.has(l.cle) ? styles.analyseOuverte : styles.analyseFermee}
                      onClick={() => basculer(l.cle)}
                      title={ouvertes.has(l.cle) ? "Replier" : "Déplier"}
                    >
                      {l.analyse}
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={styles.etoiles} aria-label={l.satisfaction ? `${l.satisfaction} sur 5` : "Pas de note"}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={l.satisfaction && n <= l.satisfaction ? styles.pleine : styles.vide}>
                      ★
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
