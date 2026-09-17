import { notFound } from "next/navigation";
import placeholders from "@/styles/placeholders.module.css";
import styles from "./page.module.css";

const TEINTES = ["ph0", "ph1", "ph2", "ph3", "ph4", "ph5"] as const;

/**
 * Fiche projet d'exemple : tant qu'il n'y a pas de vraie success story,
 * seule l'affiche (la couleur d'origine) est réelle, le reste est un
 * espace réservé pour les informations à venir.
 */
export default async function FicheExemple({
  params,
}: {
  params: Promise<{ teinte: string }>;
}) {
  const { teinte } = await params;
  const cle = TEINTES[Number(teinte)];
  if (!cle) notFound();

  return (
    <div className={styles.page}>
      <div className={`${styles.affiche} ${placeholders[cle]}`} />
      <p className={styles.attente}>Informations complètes à venir.</p>
    </div>
  );
}
