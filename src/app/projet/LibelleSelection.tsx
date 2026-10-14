/**
 * Une sélection de la Maison des Scénaristes (« Cannes 2019 », « Muse
 * Awards »…), écrite comme sur WFG 1. Pour un partenaire, le nom est un
 * lien vers son site et la mention « partenariat » suit (14/10, Sarah).
 */
const PARTENAIRES: Record<string, string> = {
  "Muse Awards": "https://museaward.com/",
};

export default function LibelleSelection({ libelle }: { libelle: string }) {
  const site = PARTENAIRES[libelle];
  if (!site) return <>Sélection Maison des Scénaristes, {libelle}</>;
  return (
    <>
      Sélection Maison des Scénaristes,{" "}
      <a href={site} target="_blank" rel="noopener noreferrer">
        {libelle}
      </a>{" "}
      (partenariat)
    </>
  );
}
