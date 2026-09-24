import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { FILMS_REALISES } from "@/data/successStories";
import { createClient } from "@/lib/supabase/server";
import styles from "./succes.module.css";

export const metadata: Metadata = { title: "Success stories — WeFilmGood" };

/**
 * Tous les films réalisés : ceux du carrousel de l'accueil, en grand,
 * affiches et textes. Page publique, comme l'accueil : c'est la vitrine.
 */
export default async function SuccesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PageShell title="Success stories" enTeteAnime connecte={!!user}>
      <ul className={styles.grille}>
        {FILMS_REALISES.map((f) => (
          <li key={f.id} className={styles.film}>
            {f.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.image} alt={f.imageAlt ?? ""} className={styles.affiche} loading="lazy" />
            )}
            <p className={styles.texte}>
              <strong>{f.titre}</strong> {f.phrase && <span>{f.phrase}</span>}
            </p>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
