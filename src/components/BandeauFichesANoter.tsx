import Link from "next/link";
import ChoixJauge from "@/components/ChoixJauge";
import { rateReport } from "@/app/projet/[id]/fiche-lecture/actions";
import { createClient } from "@/lib/supabase/server";
import styles from "./BandeauFichesANoter.module.css";

/**
 * Tant qu'un auteur n'a pas noté une fiche de lecture publiée (un cercle à
 * quatre positions depuis le 21/11),
 * ce bandeau reste en haut de Mes projets et de la fiche projet (04/11/2026,
 * Sarah). Il note d'un clic, sans quitter la page.
 */
export default async function BandeauFichesANoter({
  retour,
  projetId,
}: {
  /** La page où revenir après avoir noté. */
  retour: string;
  /** Sur une fiche projet : seulement la fiche de ce projet. */
  projetId?: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("fiches_a_noter");
  const fiches = ((data ?? []) as { report_id: string; project_id: string; project_title: string }[]).filter(
    (f) => !projetId || f.project_id === projetId,
  );
  if (fiches.length === 0) return null;

  return (
    <div className={styles.bandeau} role="region" aria-label="Notez votre fiche de lecture">
      {fiches.map((f) => (
        <form key={f.report_id} action={rateReport} className={styles.ligne}>
          <input type="hidden" name="report_id" value={f.report_id} />
          <input type="hidden" name="project_id" value={f.project_id} />
          <input type="hidden" name="retour" value={retour} />
          <p className={styles.texte}>
            Notez votre fiche de lecture
            {!projetId && (
              <>
                {" "}
                · <Link href={`/projet/${f.project_id}/fiche-lecture`}>{f.project_title}</Link>
              </>
            )}
          </p>
          <ChoixJauge taille={64} envoiDirect surDisque />
        </form>
      ))}
    </div>
  );
}
