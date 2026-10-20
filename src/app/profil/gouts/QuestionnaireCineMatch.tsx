import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { apercuCineMatch } from "@/app/cinematch/actions";
import BrouillonCineMatch from "@/app/cinematch/BrouillonCineMatch";
import { TEXTES } from "@/app/cinematch/textes";
import { saveGouts } from "../actions";
import styles from "../profil.module.css";

type Question = { key: string; label_fr: string; kind: string; position: number };
type Option = { question_key: string; option_slug: string; label_fr: string; position: number };

/**
 * Les vingt questions « si j'étais… » de CinéMatch (le portrait chinois de
 * WFG 1). Chaque question propose une liste, et un champ libre pour répondre
 * autre chose (enregistré « autre:… », comme les réponses reprises de WFG 1).
 *
 * Le même formulaire sert au bloc 3 du profil (/profil/gouts) et à la page
 * CinéMatch du Menu (/cinematch), ouverte à tout compte connecté, même
 * réduit à une adresse email. `retour` dit où revenir après l'envoi.
 *
 * Sans `userId` (visiteur sans compte), le formulaire mène au meilleur
 * match puis à la demande d'adresse email ; ses réponses sont gardées dans
 * son navigateur le temps qu'il termine.
 */
export default async function QuestionnaireCineMatch({
  userId,
  retour,
}: {
  userId?: string;
  retour?: "/cinematch";
}) {
  const supabase = await createClient();
  const [{ data: profil }, { data: questions }, { data: options }] =
    await Promise.all([
      userId
        ? supabase.from("profiles").select("personality_answers, personality_unlocked_at").eq("id", userId).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("personality_questions").select("key, label_fr, kind, position").order("position"),
      supabase
        .from("personality_options")
        .select("question_key, option_slug, label_fr, position")
        .order("position"),
    ]);

  const reponses = (profil?.personality_answers ?? {}) as Record<string, string>;
  // Une réponse donnée est verrouillée (le serveur la garde de toute façon),
  // sauf si l'administration a déverrouillé ce membre.
  const deverrouille = !!profil?.personality_unlocked_at;
  const verrouillee = (key: string) => !deverrouille && !!reponses[key];
  const optionsDe = (key: string) =>
    ((options ?? []) as Option[]).filter((o) => o.question_key === key);

  // Une réponse « autre:… » ne figure pas dans la liste : on la montre
  // dans le champ libre, et la liste reste sur « Choisir ».
  const reponseListe = (key: string) => {
    const r = reponses[key];
    return r && !r.startsWith("autre:") ? r : "";
  };
  const reponseLibre = (key: string) => {
    const r = reponses[key];
    return r && r.startsWith("autre:") ? r.slice("autre:".length) : "";
  };

  return (
    <form className={formStyles.form} action={userId ? saveGouts : apercuCineMatch} style={{ marginTop: 24 }}>
      {!userId && <BrouillonCineMatch />}
      {retour && <input type="hidden" name="retour" value={retour} />}
      <div className={styles.portrait}>
        <p className={styles.portraitIntro}>
          Le principe du portrait chinois consiste à définir une personne en l&apos;associant
          à des métaphores, à travers une série de questions rituelles.
        </p>
        {userId && Object.keys(reponses).length > 0 && !deverrouille && (
          <p className={formStyles.hint}>{TEXTES.reponsesVerrouillees}</p>
        )}

        {((questions ?? []) as Question[]).map((q) => (
          <div key={q.key} className={formStyles.field}>
            <span>{q.label_fr}</span>
            <div className={styles.row}>
              <select name={`q_${q.key}`} defaultValue={reponseListe(q.key)} disabled={verrouillee(q.key)}>
                <option value="">Choisir…</option>
                {optionsDe(q.key).map((o) => (
                  <option key={o.option_slug} value={o.option_slug}>
                    {o.label_fr}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name={`q_${q.key}_autre`}
                defaultValue={reponseLibre(q.key)}
                placeholder="ou autre chose…"
                autoComplete="off"
                disabled={verrouillee(q.key)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.pied}>
        <button type="submit" className={formStyles.submit}>
          {userId ? "Enregistrer et terminer →" : TEXTES.boutonVisiteur}
        </button>
      </div>
    </form>
  );
}
