import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { BLOCS, calculerCompletion, type Bloc } from "./completion";
import styles from "./profil.module.css";

/**
 * Un bloc de l'étape 2 : le menu des quatre blocs à gauche, le formulaire
 * à droite. Chaque bloc s'enregistre seul et renvoie au sommaire.
 */
export default async function BlocProfil({
  actif,
  children,
}: {
  actif: Bloc;
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/profil/${actif}`);

  const completion = await calculerCompletion(supabase, user.id);
  const bloc = BLOCS.find((b) => b.cle === actif)!;

  return (
    <PageShell theme="clair" nav="profil" connecte>
      <div className={styles.disposition}>
        <aside className={styles.menu}>
          <Link href="/profil" className={styles.retour}>
            ← Retour au sommaire
          </Link>
          {BLOCS.map((b) => (
            <Link
              key={b.cle}
              href={`/profil/${b.cle}`}
              className={b.cle === actif ? styles.menuItemActif : styles.menuItem}
            >
              <span className={completion.fait[b.cle] ? styles.numeroFait : styles.numero}>
                {completion.fait[b.cle] ? "✓" : b.numero}
              </span>
              {b.titre}
            </Link>
          ))}
          <p className={styles.menuNote}>
            Tout est enregistré au fur et à mesure. Vous pouvez partir et revenir quand vous
            voulez.
          </p>
        </aside>

        <div className={styles.colonne}>
          <p className={styles.surtitre}>Bloc {bloc.numero} sur {BLOCS.length}</p>
          <h1 className={styles.titre}>{bloc.titre}</h1>
          {children}
        </div>
      </div>
    </PageShell>
  );
}
