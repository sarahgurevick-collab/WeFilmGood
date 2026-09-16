import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "./lecteur.module.css";
import { createClient } from "@/lib/supabase/server";
import { respondToAssignment, updateAvailability } from "./actions";

/**
 * L'orange ne se choisit pas : la plateforme l'allume quand une lecture
 * est acceptée, et l'éteint quand la fiche est rendue.
 */
const VOYANTS = [
  { value: "vert", label: "Disponible" },
  { value: "rouge", label: "Indisponible" },
];

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

  const current = readerProfile?.availability_status ?? "vert";
  const enLecture = (assignments ?? []).some((a) => a.status === "en_cours");
  const enAttente = (assignments ?? []).filter((a) => a.status === "proposee").length;

  return (
    <PageShell eyebrow="Espace lecteur" title="Mes lectures" wide theme="clair">
      {enLecture ? (
        <div className={formStyles.field}>
          <span>Ma disponibilité</span>
          <p className={styles.etat}>
            <span className={`${styles.dot} ${styles.orange}`} aria-hidden="true" />
            En cours de lecture
          </p>
          <span className={formStyles.hint}>
            Votre disponibilité se rouvrira dès que vous aurez rendu votre fiche.
          </span>
        </div>
      ) : (
        <form className={formStyles.form} action={updateAvailability}>
          <div className={formStyles.field}>
            <span>Ma disponibilité</span>
            <div className={formStyles.roles}>
              {VOYANTS.map((v) => (
                <label key={v.value} className={formStyles.role}>
                  <input
                    type="radio"
                    name="availability_status"
                    value={v.value}
                    defaultChecked={current === v.value}
                  />
                  <span className={`${styles.dot} ${styles[v.value]}`} aria-hidden="true" />
                  {v.label}
                </label>
              ))}
            </div>
            {enAttente > 0 && (
              <span className={formStyles.hint}>
                Vous mettre en indisponible refusera {enAttente > 1 ? "les projets" : "le projet"}{" "}
                qui {enAttente > 1 ? "vous sont proposés" : "vous est proposé"}.
              </span>
            )}
          </div>
          <button type="submit" className={formStyles.submit}>
            Mettre à jour
          </button>
        </form>
      )}

      <h2 className={styles.subhead}>Projets qui me sont attribués</h2>

      {(assignments ?? []).length === 0 ? (
        <p className={formStyles.hint}>
          Aucun projet en attente. L&apos;administrateur vous en attribuera un
          lorsque votre voyant sera au vert.
        </p>
      ) : (
        <ul className={styles.list}>
          {(assignments ?? []).map((a) => (
            <li key={a.id} className={styles.card}>
              <div>
                <strong>{a.project?.title ?? "Projet supprimé"}</strong>
                <p className={formStyles.hint}>
                  {[a.project?.format, a.project?.language].filter(Boolean).join(" · ")}
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

      <p className={formStyles.linkRow} style={{ marginTop: 32 }}>
        <Link href="/lecteur/mes-fiches">Voir mes fiches de lecture</Link>
      </p>

      <form action="/deconnexion" method="post" style={{ marginTop: 24 }}>
        <button type="submit" className={styles.linkButton}>
          Se déconnecter
        </button>
      </form>
    </PageShell>
  );
}
