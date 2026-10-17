"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

/**
 * Visite guidée (ESSAI du 17/10/2026, Sarah : « des tutoriels, des mini
 * séquences pour montrer comment cela fonctionne »). De petites bulles
 * désignent, l'une après l'autre, les éléments d'une page ; le reste de la
 * page est assombri. Elle ne s'ouvre que si l'adresse contient « visite=1 »,
 * le temps que Sarah juge le rendu : aucun membre ne la voit sans ce lien.
 *
 * Chaque étape vise un élément par un sélecteur CSS (de préférence
 * [data-visite="…"]). Une cible introuvable (champ masqué, page différente)
 * est sautée, la bulle se centre alors à l'écran.
 */
export type EtapeVisite = { cible: string; titre: string; texte: string };

type Cadre = { top: number; left: number; width: number; height: number } | null;

const MARGE = 8;

export default function VisiteGuidee({ etapes }: { etapes: EtapeVisite[] }) {
  const [ouverte, setOuverte] = useState(false);
  const [i, setI] = useState(0);
  const [cadre, setCadre] = useState<Cadre>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("visite") === "1") setOuverte(true);
  }, []);

  const mesurer = useCallback(() => {
    const el = document.querySelector(etapes[i]?.cible ?? "");
    if (!el) return setCadre(null);
    const r = el.getBoundingClientRect();
    setCadre({ top: r.top - MARGE, left: r.left - MARGE, width: r.width + MARGE * 2, height: r.height + MARGE * 2 });
  }, [etapes, i]);

  // À chaque étape : on amène l'élément au milieu de l'écran, puis on mesure.
  useLayoutEffect(() => {
    if (!ouverte) return;
    const el = document.querySelector(etapes[i]?.cible ?? "");
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    mesurer();
    const t = window.setTimeout(mesurer, 450);
    return () => window.clearTimeout(t);
  }, [ouverte, i, etapes, mesurer]);

  useEffect(() => {
    if (!ouverte) return;
    const suivre = () => mesurer();
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuverte(false);
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, etapes.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("scroll", suivre, true);
    window.addEventListener("resize", suivre);
    window.addEventListener("keydown", touche);
    return () => {
      window.removeEventListener("scroll", suivre, true);
      window.removeEventListener("resize", suivre);
      window.removeEventListener("keydown", touche);
    };
  }, [ouverte, mesurer, etapes.length]);

  if (!ouverte || etapes.length === 0) return null;
  const etape = etapes[i];
  const derniere = i === etapes.length - 1;

  // La bulle : sous l'élément s'il reste de la place, sinon au-dessus ; au
  // centre de l'écran si l'élément est introuvable.
  const largeur = Math.min(340, typeof window !== "undefined" ? window.innerWidth - 32 : 340);
  let style: React.CSSProperties = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  if (cadre && typeof window !== "undefined") {
    const dessous = cadre.top + cadre.height + 12;
    const left = Math.max(16, Math.min(cadre.left, window.innerWidth - largeur - 16));
    style = dessous + 200 < window.innerHeight ? { top: dessous, left } : { top: Math.max(16, cadre.top - 12), left, transform: "translateY(-100%)" };
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Visite guidée" style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
      {/* Le voile : un cadre transparent dont l'ombre assombrit tout le reste. */}
      <div
        aria-hidden="true"
        style={
          cadre
            ? {
                position: "fixed",
                top: cadre.top,
                left: cadre.left,
                width: cadre.width,
                height: cadre.height,
                borderRadius: 12,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
                outline: "2px solid #DA2C25",
                transition: "all 0.3s ease",
                pointerEvents: "none",
              }
            : { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)" }
        }
      />
      <div
        style={{
          position: "fixed",
          width: largeur,
          ...style,
          background: "#fff",
          color: "#1a1a1a",
          borderRadius: 14,
          padding: "16px 18px 14px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          fontFamily: "inherit",
          transition: "top 0.3s ease, left 0.3s ease",
        }}
      >
        <button
          type="button"
          onClick={() => setOuverte(false)}
          aria-label="Fermer la visite"
          style={{ position: "absolute", top: 6, right: 10, border: 0, background: "none", fontSize: 22, color: "#DA2C25", cursor: "pointer" }}
        >
          ×
        </button>
        <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
          {i + 1} / {etapes.length}
        </p>
        <p style={{ margin: "4px 24px 6px 0", fontWeight: 700, fontSize: 16 }}>{etape.titre}</p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{etape.texte}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <button
            type="button"
            onClick={() => setI((n) => Math.max(n - 1, 0))}
            disabled={i === 0}
            style={{ border: 0, background: "none", color: i === 0 ? "#bbb" : "#555", cursor: i === 0 ? "default" : "pointer", fontSize: 14, padding: 0 }}
          >
            ← Précédent
          </button>
          <button
            type="button"
            onClick={() => (derniere ? setOuverte(false) : setI((n) => n + 1))}
            style={{ border: 0, borderRadius: 999, background: "#DA2C25", color: "#fff", padding: "8px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            {derniere ? "Terminer" : "Suivant →"}
          </button>
        </div>
      </div>
    </div>
  );
}
