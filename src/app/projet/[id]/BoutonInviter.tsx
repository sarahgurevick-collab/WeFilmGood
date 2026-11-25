"use client";

import { useEffect, useRef, useState } from "react";
import formStyles from "@/components/form.module.css";

/**
 * Le bouton « Inviter » (25/11/2026, Sarah) : après un envoi réussi, la
 * mention « Invitation envoyée. » en vert prend sa place, bien visible. Dès
 * qu'on recommence à remplir le formulaire, le bouton revient.
 */
export default function BoutonInviter({ envoyee }: { envoyee: boolean }) {
  const [mention, setMention] = useState(envoyee);
  const repere = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMention(envoyee);
  }, [envoyee]);

  useEffect(() => {
    const formulaire = repere.current?.closest("form");
    if (!formulaire) return;
    const reprendre = () => setMention(false);
    formulaire.addEventListener("input", reprendre);
    return () => formulaire.removeEventListener("input", reprendre);
  }, []);

  return (
    <div ref={repere}>
      {mention ? (
        <p role="status" style={{ margin: 0, padding: "14px 0", color: "#3ecf6e", fontWeight: 700, fontSize: "1.1rem" }}>
          ✓ Invitation envoyée.
        </p>
      ) : (
        <button type="submit" className={formStyles.submit}>
          Inviter
        </button>
      )}
    </div>
  );
}
