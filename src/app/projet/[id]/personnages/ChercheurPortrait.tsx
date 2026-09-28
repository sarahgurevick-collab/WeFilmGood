"use client";

import { useState } from "react";
import formStyles from "@/components/form.module.css";
import styles from "../../blocs.module.css";

type Portrait = { apercu: string; url: string; titre: string; source: string };

/**
 * Chercher un portrait sur internet (28/09) : on tape un nom, les photos
 * trouvées s'affichent, un clic en choisit une — son adresse part avec le
 * formulaire (photo_url), et le site la copie comme un portrait déposé.
 */
export default function ChercheurPortrait({ nomInitial }: { nomInitial: string }) {
  const [q, setQ] = useState(nomInitial);
  const [portraits, setPortraits] = useState<Portrait[] | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [choisi, setChoisi] = useState<Portrait | null>(null);

  const chercher = async () => {
    if (q.trim().length < 2) return;
    setEnCours(true);
    try {
      const r = await fetch(`/api/portraits?q=${encodeURIComponent(q.trim())}`);
      const d = (await r.json()) as { portraits: Portrait[] };
      setPortraits(d.portraits);
    } catch {
      setPortraits([]);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className={styles.chercheur}>
      <input type="hidden" name="photo_url" value={choisi?.url ?? ""} />
      <label className={formStyles.field}>
        <span>Comédien ou comédienne imaginé(e)</span>
        <span className={styles.chercheurLigne}>
          <input
            type="text"
            name="actor_name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                chercher();
              }
            }}
            placeholder="Juliette Binoche"
          />
          <button type="button" onClick={chercher} disabled={enCours} className={styles.chercheurBouton}>
            {enCours ? "Recherche…" : "Chercher son portrait"}
          </button>
        </span>
      </label>

      {choisi && (
        <p className={styles.chercheurChoix}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={choisi.apercu} alt="" />
          <span>
            Portrait choisi : {choisi.titre} — {choisi.source}. Il sera enregistré avec le personnage.
          </span>
          <button type="button" onClick={() => setChoisi(null)} aria-label="Annuler ce choix">
            ×
          </button>
        </p>
      )}

      {portraits && portraits.length === 0 && (
        <p className={formStyles.hint}>Aucune photo trouvée pour « {q} ».</p>
      )}
      {portraits && portraits.length > 0 && (
        <ul className={styles.chercheurResultats}>
          {portraits.map((p) => (
            <li key={p.url}>
              <button
                type="button"
                onClick={() => {
                  setChoisi(p);
                  setPortraits(null);
                }}
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
