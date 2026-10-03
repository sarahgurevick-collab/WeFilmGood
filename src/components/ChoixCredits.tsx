import AvantageAdhesion from "./AvantageAdhesion";

/**
 * La ligne des crédits de l'adhésion à 5 € par mois ou 50 € par an.
 * Le bouton DÉPÔT / ACCÈS et ses lignes ont été retirés le 03/10 (mots de Sarah).
 *
 * Règle voulue par Sarah : les crédits de la semaine non utilisés sont
 * perdus. L'objectif est de faire revenir les talents régulièrement,
 * pas de leur laisser tout dépenser en une fois.
 */
export default function ChoixCredits() {
  return (
    <AvantageAdhesion icone="loupe">
      5 crédits / semaine à choisir dans la Galaxie Projets, Talents, Personnages (non
      cumulables)
    </AvantageAdhesion>
  );
}
