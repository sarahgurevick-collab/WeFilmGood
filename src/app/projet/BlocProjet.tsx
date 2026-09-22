import Link from "next/link";
import type { ReactNode } from "react";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import profilStyles from "@/app/profil/profil.module.css";
import { BLOCS, etatDesBlocs, hrefBloc, type Bloc, type ProjetAModifier } from "./blocs";
import styles from "./blocs.module.css";

/**
 * Un bloc de la fiche projet : le menu des trois blocs à gauche, le
 * formulaire à droite — la même disposition que le profil. Sans projet
 * (nouvelle fiche), seul le premier bloc est ouvert : les deux autres
 * attendent la création.
 */
export default async function BlocProjet({
  actif,
  projet,
  children,
}: {
  actif: Bloc;
  projet: ProjetAModifier | null;
  children: ReactNode;
}) {
  const supabase = await createClient();
  const etat = projet ? await etatDesBlocs(supabase, projet.id) : null;
  const bloc = BLOCS.find((b) => b.cle === actif)!;
  const pourcentActif = etat?.pourcent[actif] ?? 0;

  return (
    <PageShell theme="clair" nav="deposer" connecte>
      <div className={profilStyles.disposition}>
        <aside className={profilStyles.menu}>
          <Link href={projet ? `/projet/${projet.id}` : "/pitchotheque"} className={profilStyles.retour}>
            {projet ? "← Retour à la fiche" : "← Retour à la pitchothèque"}
          </Link>
          {BLOCS.map((b) => {
            const estFait = etat?.fait[b.cle] ?? false;
            const pastille = (
              <span className={estFait ? profilStyles.numeroFait : profilStyles.numero}>
                {estFait ? "✓" : b.numero}
              </span>
            );
            if (!projet && b.cle !== "fiche") {
              return (
                <span key={b.cle} className={styles.menuItemInactif} title="Après la création de la fiche">
                  {pastille}
                  {b.titre}
                </span>
              );
            }
            return (
              <Link
                key={b.cle}
                href={projet ? hrefBloc(projet.id, b.cle) : "/projet"}
                className={b.cle === actif ? profilStyles.menuItemActif : profilStyles.menuItem}
              >
                {pastille}
                {b.titre}
              </Link>
            );
          })}
          <p className={profilStyles.menuNote}>
            {projet
              ? "Chaque bloc s'enregistre seul. Vous pouvez partir et revenir quand vous voulez."
              : "Les documents et les personnages s'ouvrent dès que la fiche est créée."}
          </p>
        </aside>

        <div className={profilStyles.colonne}>
          <p className={profilStyles.surtitre}>
            {projet ? `« ${projet.title} »` : "Nouvelle fiche projet"} · Bloc {bloc.numero} sur{" "}
            {BLOCS.length}
            {projet && ` · ${pourcentActif} %`}
          </p>
          <h1 className={profilStyles.titre}>{bloc.titre}</h1>
          {children}
        </div>
      </div>
    </PageShell>
  );
}
