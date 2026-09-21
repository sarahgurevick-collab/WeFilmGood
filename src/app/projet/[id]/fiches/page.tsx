import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import FicheContent from "@/components/FicheContent";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { chargerFiches } from "../fiches-donnees";
import styles from "../fiches.module.css";

/**
 * Les fiches de lecture d'un projet, sur une page à part — ouverte dans
 * un nouvel onglet depuis la fiche projet. Réservée à l'auteur et à
 * l'administration.
 */
export default async function FichesDuProjetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/projet/${id}/fiches`);

  const { data: projet } = await supabase
    .from("projects")
    .select("title")
    .eq("id", id)
    .maybeSingle<{ title: string }>();
  if (!projet) notFound();

  const fiches = await chargerFiches(supabase, id);

  return (
    <PageShell eyebrow="Fiches de lecture" title={projet.title}>
      {fiches.length === 0 ? (
        <p className={formStyles.hint}>
          Les fiches de lecture sont confidentielles : seuls l&apos;auteur du projet et
          l&apos;équipe WeFilmGood peuvent les lire.{" "}
          <Link href={`/projet/${id}`}>Retour au projet</Link>
        </p>
      ) : (
        <>
          <p className={formStyles.hint}>
            {fiches.length === 1
              ? "Une lecture a été faite sur ce projet."
              : `${fiches.length} lectures ont été faites sur ce projet, de la plus récente à la plus ancienne.`}{" "}
            Elles sont confidentielles : seuls l&apos;auteur et l&apos;équipe WeFilmGood les
            lisent.
          </p>
          {fiches.map((f, i) => (
            <details key={f.cle} open={i === 0} className={styles.fiche}>
              <summary>
                {f.date
                  ? new Date(f.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Date inconnue"}
                {f.note !== null && (
                  <span style={{ fontWeight: 400 }}>
                    {" — "}
                    {f.note}/200
                    {f.note > 150 && " · labellisé"}
                  </span>
                )}
              </summary>
              {f.html ? (
                <FicheContent html={f.contenu} />
              ) : (
                f.contenu && <p style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{f.contenu}</p>
              )}
              {f.avis && (
                <>
                  <p className={formStyles.hint} style={{ marginTop: 16, marginBottom: 4 }}>
                    Avis WeFilmGood
                  </p>
                  <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{f.avis}</p>
                </>
              )}
            </details>
          ))}
        </>
      )}
    </PageShell>
  );
}
