"use client";

import { useState } from "react";

/**
 * « Voir ses films proches » sans quitter la fiche (23/11, Sarah) : la page des
 * films proches s'ouvre en dessous, dans un cadre, et la fiche en cours de
 * correction reste intacte au-dessus.
 */
export default function FilmsProchesEnDessous({ projectId }: { projectId: string }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        style={{ background: "none", border: 0, padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
      >
        {ouvert ? "Masquer ses films proches" : "Voir ses films proches"}
      </button>
      {ouvert && (
        <iframe
          src={`/admin/films-proches?projet=${projectId}&integre=1`}
          title="Films proches"
          style={{ display: "block", width: "100%", height: "85vh", marginTop: 12, border: "1px solid #888", borderRadius: 8 }}
        />
      )}
    </div>
  );
}
