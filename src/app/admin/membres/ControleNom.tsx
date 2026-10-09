"use client";

import { useEffect, useState, useTransition } from "react";
import formStyles from "@/components/form.module.css";
import { controlerNom, type ResultatControle } from "./controle-nom";

const LIBELLES: Record<ResultatControle["etat"], string> = {
  trouve: "✓ Nom et prénom trouvés",
  partiel: "≈ Cité en partie",
  absent: "✗ Nom non trouvé",
  illisible: "Page illisible, à ouvrir",
  sans_lien: "Pas de lien",
};

/**
 * La colonne « Nom sur la page » de l'écran des membres : un clic lance le
 * contrôle (ou il part tout seul dans la liste « À valider », qui est
 * courte). Une aide : c'est l'administration qui décide.
 */
export default function ControleNom({
  profileId,
  aLien,
  auto = false,
}: {
  profileId: string;
  aLien: boolean;
  auto?: boolean;
}) {
  const [resultat, setResultat] = useState<ResultatControle | null>(aLien ? null : { etat: "sans_lien" });
  const [enCours, demarrer] = useTransition();

  const lancer = () => demarrer(async () => setResultat(await controlerNom(profileId)));

  useEffect(() => {
    if (auto && aLien) lancer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!resultat) {
    return (
      <button type="button" onClick={lancer} disabled={enCours} className={formStyles.hint} style={{ cursor: "pointer", textDecoration: "underline", background: "none", border: 0, padding: 0 }}>
        {enCours ? "Lecture…" : "Vérifier"}
      </button>
    );
  }
  return (
    <div>
      <strong>{LIBELLES[resultat.etat]}</strong>
      {resultat.detail && <div className={formStyles.hint}>{resultat.detail}</div>}
      {resultat.titre && <div className={formStyles.hint}>« {resultat.titre} »</div>}
      {resultat.lien && (
        <a href={/^https?:\/\//i.test(resultat.lien) ? resultat.lien : `https://${resultat.lien}`} target="_blank" rel="noopener noreferrer">
          Ouvrir la page
        </a>
      )}
    </div>
  );
}
