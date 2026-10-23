/**
 * Une sélection de la Maison des Scénaristes (« Cannes 2019 »…), écrite
 * comme sur WFG 1. Un partenaire (« Muse Awards ») n'est pas une sélection
 * de la Maison : la ligne dit « Partenariat », le nom en lien vers son
 * site (14/10, Sarah), mis en valeur pour qu'on voie qu'il se clique.
 */
import styles from "./LibelleSelection.module.css";

const PARTENAIRES: Record<string, string> = {
  "Muse Awards": "https://museaward.com/",
};

/**
 * Les étiquettes internes de WFG 1 rangées parmi les sélections, qui ne sont
 * pas des prix (23/10, Sarah) : « Vipfiction » donne à un producteur l'accès
 * gratuit au projet. Jamais affichées sur la fiche, jamais « Primé ».
 */
const ETIQUETTES_INTERNES = ["Vipfiction"];

/** Une étiquette interne (« Vipfiction ») : ni prix, ni sélection affichée. */
export function estEtiquetteInterne(libelle: string): boolean {
  return ETIQUETTES_INTERNES.includes(libelle);
}

/** Un partenaire (« Muse Awards ») plutôt qu'une sélection de la Maison. */
export function estPartenaire(libelle: string): boolean {
  return libelle in PARTENAIRES;
}

/** La ligne des partenariats sous le titre de la fiche, en rouge ; rien s'il n'y en a pas. */
export function LignePartenariats({ libelles }: { libelles: string[] }) {
  const partenaires = libelles.filter(estPartenaire);
  if (partenaires.length === 0) return null;
  return (
    <p className={styles.partenariats}>
      {partenaires.map((libelle, i) => (
        <span key={libelle}>
          {i > 0 && " · "}
          <LibelleSelection libelle={libelle} />
        </span>
      ))}
    </p>
  );
}

export default function LibelleSelection({ libelle }: { libelle: string }) {
  const site = PARTENAIRES[libelle];
  if (!site) return <>Sélection Maison des Scénaristes, {libelle}</>;
  return (
    <>
      Partenariat{" "}
      <a href={site} target="_blank" rel="noopener noreferrer" className={styles.lien}>
        {libelle}
      </a>
    </>
  );
}
