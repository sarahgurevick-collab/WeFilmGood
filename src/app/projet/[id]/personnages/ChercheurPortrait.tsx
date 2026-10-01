"use client";

import { useEffect, useRef, useState } from "react";
import formStyles from "@/components/form.module.css";
import styles from "../../blocs.module.css";
import { PORTRAIT_CHOISI } from "./CasePortrait";

type Portrait = { apercu: string; url: string; titre: string; source: string };

/**
 * Chercher un portrait sur internet (28/09) : on tape un nom, les photos
 * trouvées s'affichent, un clic en choisit une — son adresse part avec le
 * formulaire (photo_url), et le site la copie comme un portrait déposé.
 *
 * Depuis le 01/10 : les propositions s'affichent d'elles-mêmes dès qu'un
 * nom est tapé, sans passer par le bouton, et le portrait cliqué se pose
 * aussitôt dans la case « Portrait » du personnage (CasePortrait).
 */
export default function ChercheurPortrait({ nomInitial }: { nomInitial: string }) {
  const [q, setQ] = useState(nomInitial);
  const [portraits, setPortraits] = useState<Portrait[] | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [choisi, setChoisi] = useState<Portrait | null>(null);

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
      if (derniere.current === demande) setPortraits(d.portraits);
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

  const choisir = (p: Portrait | null) => {
    setChoisi(p);
    racine.current
      ?.closest("form")
      ?.dispatchEvent(new CustomEvent(PORTRAIT_CHOISI, { detail: p?.apercu ?? null }));
  };

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
            placeholder="Juliette Binoche"
          />
          <button type="button" onClick={() => chercher()} disabled={enCours} className={styles.chercheurBouton}>
            {enCours ? "Recherche…" : "Proposition de portrait"}
          </button>
        </span>
      </label>

      {portraits && portraits.length === 0 && (
        <p className={formStyles.hint}>Aucune photo trouvée pour « {q} ».</p>
      )}
      {portraits && portraits.length > 0 && (
        <ul className={styles.chercheurResultats}>
          {portraits.map((p) => (
            <li key={p.url}>
              <button
                type="button"
                onClick={() => choisir(choisi?.url === p.url ? null : p)}
                className={choisi?.url === p.url ? styles.chercheurRetenu : undefined}
                aria-pressed={choisi?.url === p.url}
                title={`${p.titre} — ${p.source}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.apercu} alt={p.titre} loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
