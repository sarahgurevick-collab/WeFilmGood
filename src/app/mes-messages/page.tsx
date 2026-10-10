import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "./page.module.css";
import { createClient } from "@/lib/supabase/server";

type Conversation = {
  autre_id: string;
  autre_nom: string | null;
  projet_id: string | null;
  projet_titre: string | null;
  objet: string | null;
  dernier_corps: string;
  dernier_le: string;
  dernier_de_moi: boolean;
  non_lus: number;
};

type MessageEnAttente = {
  id: string;
  project_title: string | null;
  objet: string | null;
  created_at: string;
};

/**
 * Mes messages (03/10) : une conversation par correspondant et par
 * projet, avec les messages reçus et envoyés. Sans adhésion, on ne lit
 * rien et on ne sait pas qui a écrit : seul compte le fait qu'un message
 * attend, c'est la raison d'adhérer.
 */
export default async function MesMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/mes-messages");
  }

  const { data: adherent } = await supabase.rpc("a_une_adhesion_active", { p_profile_id: user.id });

  const conversations =
    adherent === true
      ? ((await supabase.rpc("mes_conversations")).data as Conversation[] | null) ?? []
      : [];
  // Sans adhésion : les messages en attente, sans leur expéditeur.
  const enAttente =
    adherent === true
      ? []
      : (((await supabase.from("mes_messages_recus").select("id, project_title, objet, created_at")).data as
          | MessageEnAttente[]
          | null) ?? []);

  return (
    <PageShell eyebrow="Mon profil" title="Mes messages" connecte nav="messages">
      {adherent === true ? (
        conversations.length === 0 ? (
          <p className={formStyles.hint}>Aucun message pour l&apos;instant.</p>
        ) : (
          <ul className={styles.liste}>
            {conversations.map((c) => (
              <li key={`${c.autre_id}-${c.projet_id ?? ""}`}>
                <Link
                  href={`/mes-messages/avec/${c.autre_id}${c.projet_id ? `?projet=${c.projet_id}` : ""}`}
                  className={`${styles.carte} ${styles.conversation}`}
                >
                  <div className={styles.entete}>
                    <span className={styles.projet}>
                      {c.autre_nom ?? "Un membre"}
                      {c.non_lus > 0 && <span className={styles.pastille}>{c.non_lus}</span>}
                    </span>
                    <span className={styles.date}>
                      {new Date(c.dernier_le).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  {(c.projet_titre || c.objet) && (
                    <p className={formStyles.hint} style={{ margin: "0 0 6px" }}>
                      {c.projet_titre ? `À propos de « ${c.projet_titre} »` : `Objet : ${c.objet}`}
                    </p>
                  )}
                  <p className={`${styles.apercu} ${c.non_lus > 0 ? styles.apercuNonLu : ""}`}>
                    {c.dernier_de_moi && <span className={styles.vous}>Vous : </span>}
                    {c.dernier_corps}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : enAttente.length === 0 ? (
        <p className={formStyles.hint}>Aucun message pour l&apos;instant.</p>
      ) : (
        <ul className={styles.liste}>
          {enAttente.map((m) => (
            <li key={m.id} className={styles.carte}>
              <div className={styles.entete}>
                <span className={styles.projet}>
                  {m.project_title ? `À propos de « ${m.project_title} »` : m.objet ? `Objet : ${m.objet}` : "Un membre"}
                </span>
                <span className={styles.date}>{new Date(m.created_at).toLocaleDateString("fr-FR")}</span>
              </div>
              <div className={styles.verrouille}>
                <p className={styles.verrouilleTexte}>
                  Un membre vous a écrit. Votre adhésion doit être active pour lire ce message.
                </p>
                <Link href="/adhesion" className={styles.verrouilleBouton}>
                  Réactiver mon adhésion
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
