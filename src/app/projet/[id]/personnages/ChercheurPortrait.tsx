"use client";

import { useEffect, useRef, useState } from "react";
import formStyles from "@/components/form.module.css";
import styles from "../../blocs.module.css";
import { PORTRAIT_CHOISI, PORTRAIT_RETIRE } from "./CasePortrait";

type Portrait = { apercu: string; url: string; titre: string; source: string };

/**
 * Chercher un portrait sur internet (28/09) : on tape un nom, les photos
 * trouvées s'affichent, un clic en choisit une — son adresse part avec le
 * formulaire (photo_url), et le site la copie comme un portrait déposé.
 *
 * Depuis le 01/10 : les propositions s'affichent d'elles-mêmes dès qu'un
 * nom est tapé, sans passer par le bouton, et le portrait cliqué se pose
 * aussitôt dans la case « Portrait » du personnage (CasePortrait). Les
 * propositions s'effacent alors (le choix s'enregistre avec le bouton
 * « Enregistrer » du cadre, le seul) ; la croix de la case retire le choix
 * et les fait revenir.
 *
 * Un personnage sans portrait reçoit aussi des propositions sans rien
 * taper (07/10) : les pages Wikipédia qui portent son nom, pour un personnage
 * réel (« Victor Hugo »). Les photos génériques tirées de ses menus ont été
 * retirées : elles revenaient toujours et n'avaient aucun rapport. Un nom
 * tapé dans la case du comédien prend le pas sur ces propositions.
 */
export default function ChercheurPortrait({
  nomInitial,
  nomPersonnage,
  sansPortrait,
}: {
  nomInitial: string;
  /** Le nom du personnage : cherché sur Wikipédia tant qu'il n'a pas de portrait. */
  nomPersonnage: string;
  /** true tant que le personnage n'a pas de portrait enregistré. */
  sansPortrait: boolean;
}) {
  const [q, setQ] = useState(nomInitial);
  const [portraits, setPortraits] = useState<Portrait[] | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [choisi, setChoisi] = useState<Portrait | null>(null);
  // Les propositions viennent du nom du personnage, pas de ce que l'on a tapé.
  const [duNom, setDuNom] = useState(false);

  const racine = useRef<HTMLDivElement>(null);
  // La dernière recherche lancée : une réponse plus ancienne, arrivée en
  // retard, ne doit pas remplacer la plus récente.
  const derniere = useRef("");

  const chercher = async (nom: string = q) => {
    const demande = nom.trim();
    if (demande.length < 2) return;
    derniere.current = demande;
    setEnCours(true);
    try {
      const r = await fetch(`/api/portraits?q=${encodeURIComponent(demande)}`);
      const d = (await r.json()) as { portraits: Portrait[] };
      if (derniere.current === demande) {
        setPortraits(d.portraits);
        setDuNom(false);
      }
    } catch {
      if (derniere.current === demande) setPortraits([]);
    } finally {
      if (derniere.current === demande) setEnCours(false);
    }
  };

  // Les propositions arrivent seules, une fois la frappe posée.
  const [aTape, setATape] = useState(false);
  useEffect(() => {
    if (!aTape || q.trim().length < 3) return;
    const attente = setTimeout(() => chercher(q), 800);
    return () => clearTimeout(attente);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, aTape]);

  useEffect(() => {
    const nom = nomPersonnage.trim();
    if (!sansPortrait || q.trim() || nom.length < 4) return;
    const demande = `perso:${nom}`;
    derniere.current = demande;
    let abandonne = false;
    (async () => {
      try {
        const r = await fetch(`/api/portraits?perso=1&q=${encodeURIComponent(nom)}`);
        const d = (await r.json()) as { portraits: Portrait[] };
        if (!abandonne && derniere.current === demande) {
          setPortraits(d.portraits);
          setDuNom(true);
        }
      } catch {
        // Pas de proposition cette fois : la case reste comme elle est.
      }
    })();
    return () => {
      abandonne = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sansPortrait, nomPersonnage, q.trim() === ""]);

  const choisir = (p: Portrait) => {
    setChoisi(p);
    racine.current?.closest("form")?.dispatchEvent(new CustomEvent(PORTRAIT_CHOISI, { detail: p.apercu }));
  };

  // La croix de la case « Portrait » retire le choix.
  useEffect(() => {
    const formulaire = racine.current?.closest("form");
    if (!formulaire) return;
    const retirer = () => setChoisi(null);
    formulaire.addEventListener(PORTRAIT_RETIRE, retirer);
    return () => formulaire.removeEventListener(PORTRAIT_RETIRE, retirer);
  }, []);

  return (
    <div ref={racine} className={styles.chercheur}>
      <input type="hidden" name="photo_url" value={choisi?.url ?? ""} />
      <label className={formStyles.field}>
        <span>Comédien ou comédienne imaginé(e)</span>
        <span className={styles.chercheurLigne}>
          <input
            type="text"
            name="actor_name"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setATape(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                chercher();
              }
            }}
          />
          {/* Plus de deuxième bouton « Enregistrer ce portrait » (06/10, Sarah : « je clique
              sur les deux ») : il faisait exactement la même chose que « Enregistrer »,
              en bas du cadre. La croix de la case rappelle que le choix n'est pas encore enregistré. */}
          {!choisi && enCours && <span className={formStyles.hint}>Recherche…</span>}
        </span>
      </label>

      {!choisi && !duNom && portraits && portraits.length === 0 && (
        <p className={formStyles.hint}>Aucune photo trouvée pour « {q} ».</p>
      )}
      {!choisi && portraits && portraits.length > 0 && (
        <ul className={styles.chercheurResultats}>
          {portraits.map((p) => (
            <li key={p.url}>
              <button
                type="button"
                onClick={() => choisir(p)}
                title={`${p.titre} — ${p.source}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.apercu} alt={p.titre} loading="lazy" />
              </button>
              {duNom && <span className={formStyles.hint}>{p.titre}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
