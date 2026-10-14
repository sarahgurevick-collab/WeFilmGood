import Link from "next/link";
import type { PersonnagesCarte as Donnees } from "@/app/pitchotheque/personnages-carte";
import styles from "./PersonnagesCarte.module.css";

/**
 * Sous la carte d'un projet, dans les Galaxies (14/10/2026, Sarah) : les
 * portraits des premiers personnages et leur nombre. Un clic ouvre la fiche
 * directement sur le cadre « Les personnages ». Rien si le projet n'en a pas.
 */
export default function PersonnagesCarte({ projetId, personnages }: { projetId: string; personnages: Donnees | null | undefined }) {
  if (!personnages || personnages.total === 0) return null;
  return (
    <Link href={`/projet/${projetId}#personnages`} className={styles.ligne}>
      <span className={styles.portraits}>
        {personnages.portraits.map((p) => (
          <span key={p.id} className={styles.portrait} title={p.nom}>
            {p.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.url} alt="" loading="lazy" style={{ objectPosition: p.cadrage }} />
            ) : (
              <span>{p.nom.trim().charAt(0).toUpperCase()}</span>
            )}
          </span>
        ))}
      </span>
      <span className={styles.nombre}>
        {personnages.total} personnage{personnages.total > 1 ? "s" : ""}
      </span>
    </Link>
  );
}
