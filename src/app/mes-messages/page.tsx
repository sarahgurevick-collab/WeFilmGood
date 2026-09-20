import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "./page.module.css";
import { createClient } from "@/lib/supabase/server";

type MessageRecu = {
  id: string;
  project_id: string;
  project_title: string;
  sender_id: string;
  sender_name: string | null;
  created_at: string;
  body: string | null;
  verrouille: boolean;
};

export default async function MesMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/mes-messages");
  }

  const { data: messages } = await supabase
    .from("mes_messages_recus")
    .select("*")
    .returns<MessageRecu[]>();

  const liste = messages ?? [];
  const nbVerrouilles = liste.filter((m) => m.verrouille).length;

  return (
    <PageShell eyebrow="Mon profil" title="Mes messages" connecte nav="messages">
      {liste.length === 0 ? (
        <p className={formStyles.hint}>Aucun message reçu pour l&apos;instant.</p>
      ) : (
        <>
          {nbVerrouilles > 0 && (
            <p className={formStyles.hint}>
              {nbVerrouilles} message{nbVerrouilles > 1 ? "s" : ""} en attente de lecture —
              réactivez votre adhésion pour les lire.
            </p>
          )}

          <ul className={styles.liste}>
            {liste.map((m) => (
              <li key={m.id} className={styles.carte}>
                <div className={styles.entete}>
                  <span className={styles.projet}>À propos de « {m.project_title} »</span>
                  <span className={styles.date}>
                    {new Date(m.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>

                {m.verrouille ? (
                  <div className={styles.verrouille}>
                    <p className={styles.verrouilleTexte}>
                      {m.sender_name ?? "Un membre"} vous a écrit. Votre adhésion doit être
                      active pour lire ce message.
                    </p>
                    <Link href="/adhesion" className={styles.verrouilleBouton}>
                      Réactiver mon adhésion
                    </Link>
                  </div>
                ) : (
                  <>
                    <p className={formStyles.hint} style={{ marginBottom: 6 }}>
                      De {m.sender_name ?? "un membre"}
                    </p>
                    <p className={styles.corps}>{m.body}</p>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </PageShell>
  );
}
