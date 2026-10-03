import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { ecrire } from "../../actions";
import { createClient } from "@/lib/supabase/server";
import styles from "./conversation.module.css";

type Message = {
  msg_id: string;
  de_moi: boolean;
  corps: string;
  envoye_le: string;
};

/**
 * Une conversation (03/10) : tous les messages échangés avec un membre,
 * à propos d'un projet ou non, du plus ancien au plus récent, et la case
 * pour répondre en dessous. Il faut une adhésion pour la lire et pour y
 * répondre : sans elle, on retourne à la liste, qui ne montre que
 * l'existence d'un message en attente.
 */
export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ autre: string }>;
  searchParams: Promise<{ projet?: string; message?: string }>;
}) {
  const { autre } = await params;
  const { projet: projetId, message } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/connexion?next=${encodeURIComponent(`/mes-messages/avec/${autre}${projetId ? `?projet=${projetId}` : ""}`)}`,
    );
  }

  const { data: adherent } = await supabase.rpc("a_une_adhesion_active", { p_profile_id: user.id });
  if (adherent !== true) redirect("/mes-messages");

  // Ouvrir la conversation marque lus les messages reçus.
  const { data: messages } = await supabase.rpc("ouvrir_conversation", {
    p_autre: autre,
    p_projet: projetId ?? null,
  });
  const fil = (messages as Message[] | null) ?? [];
  if (fil.length === 0) notFound();

  const [{ data: interlocuteur }, { data: projet }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, display_name, full_name")
      .eq("id", autre)
      .maybeSingle<{ first_name: string | null; display_name: string | null; full_name: string | null }>(),
    projetId
      ? supabase.from("projects").select("id, title").eq("id", projetId).maybeSingle<{ id: string; title: string }>()
      : Promise.resolve({ data: null }),
  ]);
  const nom = interlocuteur?.first_name ?? interlocuteur?.display_name ?? interlocuteur?.full_name ?? "Un membre";

  return (
    <PageShell eyebrow="Mes messages" title={nom} connecte nav="messages">
      {projet && (
        <p className={formStyles.hint}>
          À propos de « <Link href={`/projet/${projet.id}`}>{projet.title}</Link> ».
        </p>
      )}

      <ul className={styles.fil}>
        {fil.map((m) => (
          <li key={m.msg_id} className={`${styles.message} ${m.de_moi ? styles.moi : styles.autre}`}>
            <p className={styles.corps}>{m.corps}</p>
            <span className={styles.date}>
              {new Date(m.envoye_le).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
            </span>
          </li>
        ))}
      </ul>

      {message === "vide" && (
        <p className={formStyles.hint} style={{ color: "#b3261e" }}>
          Le message ne peut pas être vide.
        </p>
      )}

      <form action={ecrire} className={formStyles.form} style={{ marginTop: 24 }}>
        <input type="hidden" name="project_id" value={projetId ?? ""} />
        <input type="hidden" name="recipient_id" value={autre} />
        <input type="hidden" name="retour" value="conversation" />
        <label className={formStyles.field}>
          <span>Votre message</span>
          <textarea name="body" rows={4} required />
        </label>
        <button type="submit" className={formStyles.submit}>
          Envoyer
        </button>
      </form>
    </PageShell>
  );
}
