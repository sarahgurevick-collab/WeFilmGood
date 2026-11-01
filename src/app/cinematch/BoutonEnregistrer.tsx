import formStyles from "@/components/form.module.css";

/**
 * Le bouton du questionnaire CinéMatch : « Enregistrer », à droite comme
 * sur les autres pages (01/11/2026, Sarah). Du 21/10 au 01/11, il devenait
 * « Enregistrer et terminer » à partir de 12 réponses.
 */
export default function BoutonEnregistrer(_: { reponsesInitiales?: number }) {
  return (
    <button type="submit" className={formStyles.submit} style={{ marginLeft: "auto" }}>
      Enregistrer
    </button>
  );
}
