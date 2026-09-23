import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { CHAMPS_ATELIER, dateAtelier, phaseAtelier, type Atelier } from "@/lib/ateliers";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

/** Les ateliers en visio, réservés aux membres : à venir, en cours, et les rediffusions. */
export default async function AteliersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/ateliers");

  const { data } = await supabase
    .from("ateliers")
    .select(CHAMPS_ATELIER)
    .order("debut", { ascending: true })
    .returns<Atelier[]>();
  const ateliers = data ?? [];

  const aVenir = ateliers.filter((a) => phaseAtelier(a) !== "termine");
  const rediffusions = ateliers
    .filter((a) => phaseAtelier(a) === "termine" && a.rediffusion_fichier)
    .reverse();

  return (
    <PageShell eyebrow="WeFilmGood" title="Ateliers" enTeteAnime connecte>
      <p className={styles.intro}>
        Des ateliers en direct, en visio, avec des professionnels du cinéma. Vous regardez depuis
        votre navigateur et posez vos questions par écrit ; nous les relayons aux intervenants.
      </p>

      <h2 className={styles.sousTitre}>Prochains ateliers</h2>
      {aVenir.length === 0 ? (
        <p className={styles.vide}>Aucun atelier prévu pour l&apos;instant.</p>
      ) : (
        <ul className={styles.liste}>
          {aVenir.map((a) => (
            <li key={a.id}>
              <Link href={`/ateliers/${a.salle}`} className={styles.carte}>
                <span className={styles.date}>{dateAtelier(a.debut)}</span>
                <strong>{a.titre}</strong>
                {a.description && <span className={styles.description}>{a.description}</span>}
                {phaseAtelier(a) === "ouvert" && <span className={styles.direct}>● En direct</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {rediffusions.length > 0 && (
        <>
          <h2 className={styles.sousTitre}>Rediffusions</h2>
          <ul className={styles.liste}>
            {rediffusions.map((a) => (
              <li key={a.id}>
                <Link href={`/ateliers/${a.salle}`} className={styles.carte}>
                  <span className={styles.date}>{dateAtelier(a.debut)}</span>
                  <strong>{a.titre}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageShell>
  );
}
