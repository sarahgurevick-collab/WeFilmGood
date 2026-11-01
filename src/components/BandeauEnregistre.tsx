"use client";

import { useEffect, useState } from "react";

/**
 * « Modifications enregistrées. » bien en vue après un enregistrement
 * (01/11/2026, Sarah : « cela rassure que c'est bien fait »). Avant, la
 * phrase était écrite en petit en haut de la page et passait inaperçue.
 * Le bandeau flotte en haut de l'écran, reste quelques secondes puis
 * s'efface ; on peut aussi cliquer dessus pour le fermer. Le paramètre
 * « enregistre » est retiré de l'adresse : recharger la page ne le
 * réaffiche pas.
 */
export default function BandeauEnregistre({ texte = "Modifications enregistrées." }: { texte?: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("enregistre")) {
        url.searchParams.delete("enregistre");
        window.history.replaceState(window.history.state, "", url.toString());
      }
    } catch {
      // Sans conséquence : le bandeau s'affiche quand même.
    }
    const minuterie = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(minuterie);
  }, []);

  if (!visible) return null;
  return (
    <button
      type="button"
      role="status"
      onClick={() => setVisible(false)}
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        maxWidth: "calc(100vw - 32px)",
        padding: "14px 22px",
        borderRadius: 12,
        border: "none",
        background: "#1f7a3d",
        color: "#fff",
        fontSize: 17,
        fontWeight: 700,
        boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
        cursor: "pointer",
      }}
    >
      ✓ {texte}
    </button>
  );
}
