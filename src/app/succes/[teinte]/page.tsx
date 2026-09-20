import Link from "next/link";
import { notFound } from "next/navigation";
import EnTeteAnime from "@/components/EnTeteAnime";
import { createClient } from "@/lib/supabase/server";
import placeholders from "@/styles/placeholders.module.css";
import styles from "./page.module.css";

const TEINTES = ["ph0", "ph1", "ph2", "ph3", "ph4", "ph5"] as const;

/**
 * Fiche projet d'exemple : tant qu'il n'y a pas de vraie success story,
 * seule l'affiche (la couleur d'origine) est réelle, le reste est un
 * espace réservé pour les informations à venir. Les flèches tournent
 * dans les 6 teintes en attendant les vraies fiches à enchaîner.
 */
export default async function FicheExemple({
  params,
}: {
  params: Promise<{ teinte: string }>;
}) {
  const { teinte } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const index = Number(teinte);
  const cle = TEINTES[index];
  if (!cle) notFound();

  const precedent = (index - 1 + TEINTES.length) % TEINTES.length;
  const suivant = (index + 1) % TEINTES.length;

  return (
    <div className={styles.page}>
      <EnTeteAnime connecte={!!user} />

      <Link
        href={`/succes/${precedent}`}
        className={`${styles.fleche} ${styles.flecheGauche}`}
        aria-label="Fiche précédente"
      >
        ‹
      </Link>
      <Link
        href={`/succes/${suivant}`}
        className={`${styles.fleche} ${styles.flecheDroite}`}
        aria-label="Fiche suivante"
      >
        ›
      </Link>

      <div className={`${styles.affiche} ${placeholders[cle]}`} />
      <p className={styles.attente}>Informations complètes à venir.</p>
    </div>
  );
}
