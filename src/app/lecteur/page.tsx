import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "./lecteur.module.css";
import { createClient } from "@/lib/supabase/server";
import { respondToAssignment, updateAvailability } from "./actions";
import { nomDeLangue } from "@/lib/langues";
import FichesDuLecteur from "./FichesDuLecteur";

type Assignment = {
  id: string;
  status: string;
  assigned_at: string;
  project: { id: string; title: string; format: string | null; language: string | null } | null;
};

export default async function LecteurPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/lecteur");
  }

  const { data: readerRole } = await supabase
    .from("profile_roles")
    .select("role_slug")
    .eq("profile_id", user.id)
    .eq("role_slug", "lecteur")
    .maybeSingle();

  if (!readerRole) {
    redirect("/");
  }

  const { data: readerProfile } = await supabase
    .from("reader_profiles")
    .select("availability_status")
    .eq("profile_id", user.id)
    .maybeSingle();

  const { data: assignments } = await supabase
    .from("reading_assignments")
    .select("id, status, assigned_at, project:projects(id, title, format, language)")
    .eq("reader_id", user.id)
    .in("status", ["proposee", "en_cours"])
    .order("assigned_at", { ascending: true })
    .returns<Assignment[]>();

  const accepte = (readerProfile?.availability_status ?? "vert") === "vert";
  const enLecture = (assignments ?? []).some((a) => a.status === "en_cours");
  const enAttente = (assignments ?? []).filter((a) => a.status === "proposee").length;

  return (
    <PageShell title="Mes lectures" theme="clair">
      {/* La phrase de WFG 1, avec son interrupteur OUI / NON (16/10). L'orange
          ne se choisit pas : la plateforme l'allume quand une lecture est
          acceptée, et l'éteint quand la fiche est rendue. */}
      {enLecture ? (
        <div className={formStyles.field}>
          <p className={styles.etat}>
            <span className={`${styles.dot} ${styles.orange}`} aria-hidden="true" />
            En cours de lecture
          </p>
          <span className={formStyles.hint}>
            Vous pourrez de nouveau recevoir des lectures dès que vous aurez rendu votre fiche.
          </span>
        </div>
      ) : (
        <form className={formStyles.field} action={updateAvailability}>
          <div className={styles.accepte}>
            <span className={styles.accepteTexte}>Accepter de recevoir des nouvelles lectures</span>
            <button
              type="submit"
              name="availability_status"
              value={accepte ? "rouge" : "vert"}
              role="switch"
              aria-checked={accepte}
              aria-label="Accepter de recevoir des nouvelles lectures"
              className={`${styles.interrupteur} ${accepte ? styles.interrupteurOui : ""}`}
            >
              <span className={styles.interrupteurMot}>{accepte ? "OUI" : "NON"}</span>
              <span className={styles.interrupteurRond} aria-hidden="true" />
            </button>
          </div>
          {enAttente > 0 && (
            <span className={formStyles.hint}>
              Refuser de recevoir des lectures refusera le projet qui vous est proposé.
            </span>
          )}
        </form>
      )}

      <h2 className={styles.subhead}>Projet qui m&apos;est attribué</h2>

      {(assignments ?? []).length === 0 ? (
        <p className={formStyles.hint}>
          Aucun projet en attente. Un membre de l&apos;équipe de la Maison des
          Scénaristes/WeFilmGood vous en attribuera un lorsque vous aurez
          accepté de recevoir des nouvelles lectures.
        </p>
      ) : (
        <ul className={styles.list}>
          {(assignments ?? []).map((a) => (
            <li key={a.id} className={styles.card}>
              <div>
                <strong>{a.project?.title ?? "Projet supprimé"}</strong>
                <p className={formStyles.hint}>
                  {[a.project?.format, nomDeLangue(a.project?.language)].filter(Boolean).join(" · ")}
                  {" — attribué le "}
                  {new Date(a.assigned_at).toLocaleDateString("fr-FR")}
                </p>
              </div>

              {a.status === "proposee" ? (
                <div className={styles.actions}>
                  <form action={respondToAssignment}>
                    <input type="hidden" name="assignment_id" value={a.id} />
                    <input type="hidden" name="decision" value="accepte" />
                    <button type="submit" className={formStyles.submit}>
                      Accepter
                    </button>
                  </form>
                  <form action={respondToAssignment}>
                    <input type="hidden" name="assignment_id" value={a.id} />
                    <input type="hidden" name="decision" value="refuse" />
                    <button type="submit" className={styles.linkButton}>
                      Refuser
                    </button>
                  </form>
                </div>
              ) : (
                <Link href={`/lecteur/${a.id}`} className={formStyles.submit}>
                  Rédiger la fiche
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className={styles.subhead}>Mes fiches de lecture</h2>
      <FichesDuLecteur supabase={supabase} userId={user.id} />

      <form action="/deconnexion" method="post" style={{ marginTop: 24 }}>
        <button type="submit" className={styles.linkButton}>
          Se déconnecter
        </button>
      </form>
    </PageShell>
  );
}
