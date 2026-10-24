"use client";

import { useState, useTransition } from "react";
import { cocherPhoto } from "./actions";

export type PhotoAffichee = {
  id: string;
  vignette: string | null;
  grand: string | null;
  legende: string | null;
  date: string | null;
  enLigne: boolean;
  album?: string;
};

/**
 * Les photos d'un album, à cocher une à une (cochée = peut aller en
 * ligne). Un clic sur la photo l'ouvre en grand ; la croix referme.
 */
export default function GrillePhotos({ photos }: { photos: PhotoAffichee[] }) {
  const [coches, setCoches] = useState(() => new Map(photos.map((p) => [p.id, p.enLigne])));
  const [ouverte, setOuverte] = useState<PhotoAffichee | null>(null);
  const [, demarrer] = useTransition();

  const basculer = (id: string) => {
    const valeur = !coches.get(id);
    setCoches(new Map(coches).set(id, valeur));
    demarrer(async () => {
      const r = await cocherPhoto(id, valeur);
      if (!r.ok) setCoches((c) => new Map(c).set(id, !valeur));
    });
  };

  return (
    <>
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, listStyle: "none", padding: 0, margin: "16px 0" }}>
        {photos.map((p) => {
          const coche = coches.get(p.id) ?? false;
          return (
            <li
              key={p.id}
              style={{ border: `3px solid ${coche ? "#DA2C25" : "transparent"}`, borderRadius: 12, padding: 4, background: "var(--surface, #fff)" }}
            >
              <button type="button" onClick={() => setOuverte(p)} style={{ display: "block", width: "100%", padding: 0, border: 0, background: "none", cursor: "zoom-in" }}>
                {p.vignette && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.vignette} alt={p.legende ?? ""} loading="lazy" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, background: "#eee", display: "block" }} />
                )}
              </button>
              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px 4px", fontSize: 14, cursor: "pointer" }}>
                <input type="checkbox" checked={coche} onChange={() => basculer(p.id)} style={{ width: 18, height: 18, accentColor: "#DA2C25" }} />
                <span>{coche ? "En ligne" : "Mettre en ligne"}</span>
              </label>
              {(p.album || p.date) && (
                <p style={{ margin: "0 4px 4px", fontSize: 12, color: "var(--dim, #666)" }}>
                  {[p.album, p.date].filter(Boolean).join(" · ")}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {ouverte && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOuverte(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.88)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setOuverte(null)}
            style={{ position: "absolute", top: 12, right: 16, fontSize: 34, lineHeight: 1, color: "#fff", background: "none", border: 0, cursor: "pointer" }}
          >
            ×
          </button>
          {ouverte.grand && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ouverte.grand} alt={ouverte.legende ?? ""} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "82vh", objectFit: "contain" }} />
          )}
          {(ouverte.legende || ouverte.date) && (
            <p style={{ color: "#eee", maxWidth: 800, textAlign: "center", fontSize: 14, marginTop: 12 }}>
              {[ouverte.date, ouverte.legende].filter(Boolean).join(" — ")}
            </p>
          )}
        </div>
      )}
    </>
  );
}
