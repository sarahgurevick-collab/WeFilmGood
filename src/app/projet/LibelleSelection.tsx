/**
 * Une sélection de la Maison des Scénaristes (« Cannes 2019 »…), écrite
 * comme sur WFG 1. Un partenaire (« Muse Awards ») n'est pas une sélection
 * de la Maison : la ligne dit « Partenariat », le nom en lien vers son
 * site (14/10, Sarah), mis en valeur pour qu'on voie qu'il se clique.
 */
import styles from "./LibelleSelection.module.css";

const PARTENAIRES: Record<string, string | null> = {
  "Muse Awards": "https://museaward.com/",
  // La Sélection Cinephilia est la leur, pas celle de la Maison (Sarah, 24/10).
  Cinephilia: "https://www.cinephiliaproductions.com/",
  // Partenariat (Sarah, 24/10) ; site à demander — sans lien en attendant.
  "Digital Lab Africa": null,
};

/*
 * Les « clés Finder » de WFG 1 (Netflix, Vipfiction, FFFMED…) ne sont pas des
 * sélections : la base les refuse (table selections_exclues, migration 0199).
 */
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
  if (!estPartenaire(libelle)) return <>Sélection Maison des Scénaristes, {libelle}</>;
  const site = PARTENAIRES[libelle];
  if (!site) return <>Partenariat {libelle}</>;
  return (
    <>
      Partenariat{" "}
      <a href={site} target="_blank" rel="noopener noreferrer" className={styles.lien}>
        {libelle}
      </a>
    </>
  );
}
