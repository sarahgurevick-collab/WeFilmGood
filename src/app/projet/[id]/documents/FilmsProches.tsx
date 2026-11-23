"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import formStyles from "@/components/form.module.css";
import { ajouterFilmProche, chercherFilm, retirerFilmProche, type FilmTrouve } from "./actions";

export type FilmCite = { id: string; titre: string; annee: number | null; realisateur: string | null };

const MINIMUM = 3;

/**
 * Les films ou séries proches du projet (23/11, Sarah) : l'auteur tape un
 * titre, le site le cherche dans sa base ; s'il n'y est pas, le titre est
 * gardé tel qu'écrit. Trois au moins, sans maximum. Chaque titre est
 * enregistré aussitôt, sans passer par le bouton « Enregistrer ».
 */
export default function FilmsProches({ projectId, films }: { projectId: string; films: FilmCite[] }) {
  const routeur = useRouter();
  const [saisie, setSaisie] = useState("");
  const [propositions, setPropositions] = useState<FilmTrouve[]>([]);
  const [cherche, setCherche] = useState(false);
  const [enCours, demarrer] = useTransition();
  const tour = useRef(0);
  const texte = saisie.trim();

  useEffect(() => {
    const monTour = ++tour.current;
    if (texte.length < 2) {
      setPropositions([]);
      setCherche(false);
      return;
    }
    setCherche(true);
    const attente = setTimeout(async () => {
      try {
        const trouves = await chercherFilm(projectId, texte);
        if (monTour === tour.current) setPropositions(trouves);
      } finally {
        if (monTour === tour.current) setCherche(false);
      }
    }, 300);
    return () => clearTimeout(attente);
  }, [texte, projectId]);

  function ajouter(titre: string, filmId: number | null) {
    if (!titre.trim() || enCours) return;
    tour.current++;
    setSaisie("");
    setPropositions([]);
    demarrer(async () => {
      await ajouterFilmProche(projectId, titre, filmId);
      routeur.refresh();
    });
  }

  const ligne = { display: "flex", alignItems: "center", gap: 12, padding: "6px 0" } as const;
  const bouton = {
    background: "none",
    border: 0,
    padding: 0,
    color: "inherit",
    font: "inherit",
    textDecoration: "underline",
    cursor: "pointer",
  } as const;
  const detail = (f: { annee: number | null; realisateur: string | null }) =>
    [f.annee, f.realisateur].filter(Boolean).join(", ");

  return (
    <div>
      {films.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
          {films.map((f) => (
            <li key={f.id} style={ligne}>
              <span>
                {f.titre}
                {detail(f) && <span style={{ opacity: 0.6 }}> ({detail(f)})</span>}
              </span>
              <button
                type="button"
                style={bouton}
                disabled={enCours}
                onClick={() =>
                  demarrer(async () => {
                    await retirerFilmProche(projectId, f.id);
                    routeur.refresh();
                  })
                }
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={formStyles.field}>
        <input
          type="text"
          value={saisie}
          maxLength={200}
          placeholder="Titre du film ou de la série"
          aria-label="Titre du film ou de la série"
          autoComplete="off"
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => {
            // Entrée ne doit pas envoyer le grand formulaire de la page.
            if (e.key === "Enter") {
              e.preventDefault();
              const exact = propositions.find((p) => p.titre.toLowerCase() === texte.toLowerCase());
              ajouter(exact ? exact.titre : texte, exact ? exact.film_id : null);
            }
          }}
        />
      </div>
      {texte.length >= 2 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
          {propositions.map((p) => (
            <li key={p.film_id} style={ligne}>
              <button type="button" style={bouton} disabled={enCours} onClick={() => ajouter(p.titre, p.film_id)}>
                {p.titre}
              </button>
              {detail(p) && <span style={{ opacity: 0.6 }}>{detail(p)}</span>}
            </li>
          ))}
          {!cherche && (
            <li style={ligne}>
              <button type="button" style={bouton} disabled={enCours} onClick={() => ajouter(texte, null)}>
                Ajouter « {texte} »
              </button>
            </li>
          )}
        </ul>
      )}
      {films.length < MINIMUM && (
        <p className={formStyles.hint}>
          {films.length === 0
            ? "Citez-en au moins 3."
            : `Encore ${MINIMUM - films.length} pour arriver à 3.`}
        </p>
      )}
    </div>
  );
}
