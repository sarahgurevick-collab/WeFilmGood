/**
 * Une sélection de la Maison des Scénaristes (« Cannes 2019 »…), écrite
 * comme sur WFG 1. Un partenaire (« Muse Awards ») n'est pas une sélection
 * de la Maison : la ligne dit « Partenariat », le nom en lien vers son
 * site (14/10, Sarah).
 */
const PARTENAIRES: Record<string, string> = {
  "Muse Awards": "https://museaward.com/",
};

export default function LibelleSelection({ libelle }: { libelle: string }) {
  const site = PARTENAIRES[libelle];
  if (!site) return <>Sélection Maison des Scénaristes, {libelle}</>;
  return (
    <>
      Partenariat{" "}
      <a href={site} target="_blank" rel="noopener noreferrer">
        {libelle}
      </a>
    </>
  );
}
