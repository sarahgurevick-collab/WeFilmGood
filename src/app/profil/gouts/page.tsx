import { redirect } from "next/navigation";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import BlocProfil from "../BlocProfil";
import { saveGouts } from "../actions";
import styles from "../profil.module.css";

type Question = { key: string; label_fr: string; kind: string; position: number };
type Option = { question_key: string; option_slug: string; label_fr: string; position: number };

/**
 * Bloc 3 — Mieux vous connaître : les genres de prédilection, puis le
 * portrait chinois de WFG 1, vingt questions « si j'étais… ». Chaque
 * question propose une liste, et un champ libre pour répondre autre chose
 * (enregistré « autre:… », comme les réponses reprises de WFG 1).
 */
export default async function GoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/profil/gouts");

  const [{ data: profil }, { data: genresChoisis }, { data: tousGenres }, { data: questions }, { data: options }] =
    await Promise.all([
      supabase.from("profiles").select("personality_answers").eq("id", user.id).maybeSingle(),
      supabase.from("profile_genres").select("genre_slug").eq("profile_id", user.id),
      supabase.from("genres").select("slug, label_fr").order("position"),
      supabase.from("personality_questions").select("key, label_fr, kind, position").order("position"),
      supabase
        .from("personality_options")
        .select("question_key, option_slug, label_fr, position")
        .order("position"),
    ]);
  const aGenre = (slug: string) => (genresChoisis ?? []).some((g) => g.genre_slug === slug);

  const reponses = (profil?.personality_answers ?? {}) as Record<string, string>;
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
    <BlocProfil actif="gouts">
      <p className={formStyles.hint}>
        Ces réponses permettent aux autres membres de vous trouver — et de vous ressembler.
      </p>

      <form className={formStyles.form} action={saveGouts} style={{ marginTop: 24 }}>
        <div className={formStyles.field}>
          <span>Mes genres de prédilection</span>
          <div className={formStyles.roles}>
            {(tousGenres ?? []).map((g) => (
              <label key={g.slug} className={formStyles.role}>
                <input type="checkbox" name="genres" value={g.slug} defaultChecked={aGenre(g.slug)} />
                {g.label_fr}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.portrait}>
          <h2 className={styles.portraitTitre}>Mon portrait chinois</h2>
          <p className={formStyles.hint}>
            Vingt questions, aucune obligatoire. Choisissez dans la liste, ou écrivez votre
            propre réponse à côté. Deux membres qui répondent la même chose se rapprochent.
          </p>

          {((questions ?? []) as Question[]).map((q) => (
            <div key={q.key} className={formStyles.field}>
              <span>{q.label_fr}</span>
              <div className={styles.row}>
                <select name={`q_${q.key}`} defaultValue={reponseListe(q.key)}>
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
                />
              </div>
            </div>
          ))}
        </div>

        <div className={styles.pied}>
          <button type="submit" className={styles.bouton}>
            Enregistrer et terminer →
          </button>
        </div>
      </form>
    </BlocProfil>
  );
}
