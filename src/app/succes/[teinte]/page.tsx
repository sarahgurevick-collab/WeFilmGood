import { notFound } from "next/navigation";
import placeholders from "@/styles/placeholders.module.css";
import styles from "./page.module.css";

const TEINTES = ["ph0", "ph1", "ph2", "ph3", "ph4", "ph5"] as const;

/**
 * Fiche projet d'exemple : tant qu'il n'y a pas de vraie success story,
 * la page est juste colorée comme l'affiche depuis laquelle on arrive.
 */
export default async function FicheExemple({
  params,
}: {
  params: Promise<{ teinte: string }>;
}) {
  const { teinte } = await params;
  const cle = TEINTES[Number(teinte)];
  if (!cle) notFound();

  return <div className={`${styles.page} ${placeholders[cle]}`} />;
}
