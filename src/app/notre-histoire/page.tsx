import type { Metadata } from "next";
import AnneauRelief, { type ElementAnneau } from "@/components/AnneauRelief";
import PageShell from "@/components/PageShell";
import { FESTIVALS } from "@/data/festivals";
import { createClient } from "@/lib/supabase/server";
import styles from "./notre-histoire.module.css";

export const metadata: Metadata = { title: "Notre histoire — WeFilmGood" };

/**
 * « Notre histoire » (15/10/2026, Sarah) : l'ancienne page Festivals &
 * Résidences, refaite. Une phrase d'ouverture sur le premier pavillon à
 * Cannes, puis l'anneau des festivals, un logo par festival ; un clic
 * ouvre le festival (la roue des années, les projets, les photos).
 */
export default async function NotreHistoirePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const elements: ElementAnneau[] = FESTIVALS.map((f) => ({
    id: f.id,
    href: `/notre-histoire/${f.id}`,
    legende: f.nom,
    contenu: f.logo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={f.logo} alt={f.nom} className={styles.logo} draggable={false} />
    ) : (
      <span className={styles.nomSeul}>{f.nom}</span>
    ),
  }));

  return (
    <PageShell eyebrow="WeFilmGood" title="Notre histoire" enTeteAnime connecte={!!user}>
      {/* La phrase de la frise de l'association (2011-2012), reprise telle quelle. */}
      <p className={styles.ouverture}>
        <strong>2012.</strong> Le début d&apos;une très belle aventure humaine et la naissance du
        1er pavillon des Scénaristes au festival de Cannes.
      </p>
      <AnneauRelief elements={elements} largeurElement={190} hauteurElement={126} />
      <p className={styles.indice}>Cliquez sur un festival pour voir ses sélections, année par année.</p>
    </PageShell>
  );
}
