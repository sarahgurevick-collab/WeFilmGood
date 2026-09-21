"use client";

import { useFormStatus } from "react-dom";
import formStyles from "@/components/form.module.css";

/**
 * Le bouton se bloque dès le premier clic : le lien ne sert qu'une fois,
 * un second envoi pendant que le premier se termine le ferait passer
 * pour « déjà servi ».
 */
export default function BoutonConfirmer({ libelle }: { libelle: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={formStyles.submitWide} disabled={pending}>
      {pending ? "Un instant…" : libelle}
    </button>
  );
}
