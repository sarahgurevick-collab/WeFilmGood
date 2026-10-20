import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { inviterUnTalent } from "./actions";

const MESSAGES: Record<string, { texte: string; ok?: boolean }> = {
  ok: { texte: "Invitation envoyée.", ok: true },
  adresse: { texte: "Cette adresse email n'est pas valide." },
  metier: { texte: "Choisissez un métier." },
  deja: { texte: "Cette personne est déjà dans l'équipe, ou déjà invitée." },
  plafond: { texte: "Dix invitations par jour au plus : réessayez demain." },
  envoi: { texte: "L'invitation est enregistrée, mais l'email n'est pas parti. Réessayez dans un instant." },
  erreur: { texte: "L'invitation a échoué. Réessayez dans un instant." },
};

/**
 * Pour le porteur (20/10/2026, Sarah) : ajouter un talent à son projet par
 * son adresse email et son métier. Le talent reçoit un lien magique et
 * accepte ; tant qu'il n'a pas répondu, il n'apparaît que dans l'équipe du
 * porteur, « Invitation envoyée ».
 */
export default async function AjouterUnTalent({ projectId, resultat }: { projectId: string; resultat?: string }) {
  const supabase = await createClient();
  const { data: metiers } = await supabase
    .from("roles")
    .select("slug, label_fr")
    .lt("position", 90)
    .order("position")
    .returns<{ slug: string; label_fr: string }[]>();
  const message = resultat ? MESSAGES[resultat] : undefined;
  return (
    <section id="equipe" style={{ margin: "32px 0" }}>
      <h2>Ajouter un talent</h2>
      {message && <p className={message.ok ? formStyles.hint : formStyles.error}>{message.texte}</p>}
      <form action={inviterUnTalent} className={formStyles.form} style={{ marginTop: 12 }}>
        <input type="hidden" name="project_id" value={projectId} />
        <label className={formStyles.field}>
          <span>Adresse email</span>
          <input type="email" name="email" required autoComplete="off" />
        </label>
        <label className={formStyles.field}>
          <span>Prénom (facultatif)</span>
          <input type="text" name="prenom" maxLength={60} autoComplete="off" />
        </label>
        <label className={formStyles.field}>
          <span>Métier sur ce projet</span>
          <select name="metier" required defaultValue="">
            <option value="" disabled>
              Choisir
            </option>
            {(metiers ?? []).map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.label_fr}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={formStyles.submit}>
          Inviter
        </button>
      </form>
    </section>
  );
}
