"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { basculerValidation } from "../profils/actions";
import adminStyles from "../admin.module.css";

/**
 * Le voyant « Validé / Non valide » de la colonne Validation (filtre « À
 * valider »). Vert par défaut, un clic écarte la référence (rouge), un
 * second la rétablit. Il change de couleur dès que la base a répondu : la
 * page des membres est longue à recalculer, et le 07/11 Sarah a cliqué
 * sans voir aucun changement alors que le clic avait bien été enregistré.
 * Pendant l'enregistrement, le bouton pâlit et ne répond plus.
 */
export default function BoutonValidation({ profileId, statut }: { profileId: string; statut: string | null }) {
  const [refusee, setRefusee] = useState(statut === "refusee");
  const [enCours, demarrer] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={enCours}
      className={refusee ? adminStyles.voyantRouge : adminStyles.voyantVert}
      style={enCours ? { opacity: 0.5, cursor: "wait" } : undefined}
      title={refusee ? "Référence écartée — cliquer pour la rétablir" : "Référence acceptée — cliquer pour l'écarter"}
      onClick={() =>
        demarrer(async () => {
          const nouveau = await basculerValidation(profileId, refusee ? "validee" : "refusee");
          if (nouveau) {
            setRefusee(nouveau === "refusee");
            router.refresh();
          }
        })
      }
    >
      {refusee ? "Non valide" : "Validé"}
    </button>
  );
}
