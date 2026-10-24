import type { Metadata } from "next";
import Link from "next/link";
import Frise from "@/components/Frise";
import PageShell from "@/components/PageShell";
import { RENCONTRES } from "@/data/association";
import { FESTIVALS } from "@/data/festivals";
import { photosCocheesParAnnee } from "@/lib/photos-archives";
import { createClient } from "@/lib/supabase/server";
import { etapesHistoire } from "./etapes";
import VisionneusePhotos, { type PhotoHistoire } from "./VisionneusePhotos";
import styles from "./notre-histoire.module.css";

export const metadata: Metadata = { title: "Notre histoire — WeFilmGood" };

/**
 * « Notre histoire » (15/10/2026, Sarah) : la phrase du premier pavillon
 * à Cannes, puis les photos des rencontres, la photo à gauche et la roue
 * des titres à droite, exactement comme les Masterclass. Les projets
 * sélectionnés sont sur une autre page, festival par festival.
 *
 * ESSAI (22/10/2026) : la frise horizontale des appels à projets, sur
 * fond noir, en tête de page — une étape par année depuis 2012 (voir
 * etapes.tsx). Page d'avant : étiquette git « notre-histoire-avant-frise ».
 */
export default async function NotreHistoirePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // « Festival de Cannes « Nuit Blanche du Scénario » animée par … » : le
  // festival en titre, le reste en dessous. L'année viendra avec les
  // photos classées que Sarah fournira.
  const photos: PhotoHistoire[] = RENCONTRES.map((r, i) => {
    const coupe = r.legende.indexOf(" « ");
    const titre = coupe > 0 ? r.legende.slice(0, coupe) : r.legende;
    const sous = coupe > 0 ? r.legende.slice(coupe + 1) : undefined;
    return { id: `photo-${i + 1}`, image: r.image, titre, sous };
  });

  return (
    <PageShell enTeteAnime connecte={!!user}>
      <Frise
        etapes={etapesHistoire(await photosCocheesParAnnee())}
        titre="Notre histoire"
        periode="2012 — 2026"
        image="/association/rencontres/02.jpg"
        imageAlt="Un rendez-vous au pavillon de la Maison des Scénaristes, Festival de Cannes"
      />

      {/* La phrase de la frise de l'association (2011-2012), reprise telle quelle. */}
      <p className={styles.ouverture}>
        <strong>2012.</strong> Le début d&apos;une très belle aventure humaine et la naissance du
        1er pavillon des Scénaristes au festival de Cannes.
      </p>

      <VisionneusePhotos photos={photos} />

      <h2 className={styles.sousTitre}>Les projets sélectionnés</h2>
      <ul className={styles.festivals}>
        {FESTIVALS.map((f) => (
          <li key={f.id}>
            <Link href={`/notre-histoire/${f.id}`}>{f.nom}</Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
