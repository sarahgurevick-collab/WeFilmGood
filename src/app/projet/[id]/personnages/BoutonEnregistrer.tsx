"use client";

import { useFormStatus } from "react-dom";
import formStyles from "@/components/form.module.css";

/** Le bouton du cadre : il dit « Enregistrement… » pendant l'envoi (06/10, demande de Sarah : « il ne se passe rien »). */
export default function BoutonEnregistrer({ libelle }: { libelle: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={formStyles.submit} disabled={pending}>
      {pending ? "Enregistrement…" : libelle}
    </button>
  );
}
