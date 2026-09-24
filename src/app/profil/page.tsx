import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";
import { BLOCS, calculerCompletion } from "./completion";
import styles from "./profil.module.css";

const CATEGORIES: Record<string, string> = {
  auteur: "Auteur",
  producteur: "Producteur",
  talent: "Autre Talent",
};

/** Les pays repris de WFG 1 sont parfois des codes (« FR ») : on les écrit en toutes lettres. */
const nomsDePays = new Intl.DisplayNames(["fr"], { type: "region" });
const pays = (p: string | null) => {
  if (!p) return null;
  if (/^[A-Z]{2}$/.test(p)) {
    try {
      return nomsDePays.of(p) ?? p;
    } catch {
      return p;
    }
  }
  return p;
};

const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * Sommaire de l'étape 2. On y arrive juste après avoir activé son compte,
 * puis chaque fois qu'on ouvre « Mon profil » : quatre blocs à compléter
 * quand on veut, une jauge, et en bas le lien discret vers les réglages du compte.
 */
export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ enregistre?: string; bienvenue?: string }>;
}) {
  const { enregistre, bienvenue } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/profil");

  const [
    { pourcent, pourcentBloc, fait, profil },
    { data: fiche },
    { data: metiers },
    { data: genres },
    { data: questions },
    { data: options },
  ] = await Promise.all([
    calculerCompletion(supabase, user.id),
    supabase
      .from("profiles")
      .select("avatar_url, city, country, personality_answers")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profile_roles")
      .select("roles(label_fr, position)")
      .eq("profile_id", user.id)
      .neq("role_slug", "lecteur"),
    supabase.from("profile_genres").select("genres(label_fr, position)").eq("profile_id", user.id),
    supabase.from("personality_questions").select("key, label_fr").order("position"),
    supabase.from("personality_options").select("question_key, option_slug, label_fr"),
  ]);

  const prenom = profil?.first_name ?? profil?.full_name?.split(" ")[0] ?? null;
  const nom = profil?.full_name ?? prenom ?? "Mon profil";


  type Libelle = { label_fr: string; position: number };
  const libelles = (lignes: unknown, champ: "roles" | "genres") =>
    ((lignes ?? []) as Record<string, Libelle | Libelle[] | null>[])
      .flatMap((l) => l[champ] ?? [])
      .sort((a, b) => a.position - b.position)
      .map((l) => l.label_fr);
  const listeMetiers = libelles(metiers, "roles");
  const listeGenres = libelles(genres, "genres");

  const lieu = [fiche?.city ? majuscule(fiche.city) : null, pays(fiche?.country ?? null)]
    .filter(Boolean)
    .join(", ");

  // Une réplique du portrait chinois, la première à laquelle on a répondu.
  const reponses = (fiche?.personality_answers ?? {}) as Record<string, string>;
  const question = ((questions ?? []) as { key: string; label_fr: string }[]).find(
    (q) => reponses[q.key],
  );
  const replique = question
    ? {
        question: question.label_fr,
        reponse: reponses[question.key].startsWith("autre:")
          ? reponses[question.key].slice("autre:".length)
          : (((options ?? []) as { question_key: string; option_slug: string; label_fr: string }[]).find(
              (o) => o.question_key === question.key && o.option_slug === reponses[question.key],
            )?.label_fr ?? reponses[question.key]),
      }
    : null;

  return (
    <PageShell nav="profil" connecte>
      {enregistre && <p className={styles.ok}>Modifications enregistrées.</p>}

      {bienvenue && <p className={styles.surtitre}>Étape 2 sur 2</p>}
      <h1 className={styles.titre}>
        {bienvenue ? `Bienvenue${prenom ? ` ${prenom}` : ""}, votre compte est activé.` : "Mon profil"}
      </h1>
      <p className={styles.chapeau}>
        {pourcent === 100
          ? "Votre profil est complet. Vous pouvez le modifier quand vous voulez."
          : "Complétez votre profil quand vous voulez : chaque bloc prend deux minutes."}
      </p>

      <div className={styles.scene}>
        {/* L'affiche : la fiche telle que la voient les producteurs. Ce qui
            manque y apparaît en pointillés, et mène au bloc qui le remplit. */}
        <section className={styles.affiche} aria-label="Votre fiche">
          <p className={styles.afficheSurtitre}>Ce que voit un talent connecté</p>
          <div className={styles.affichePhoto} aria-hidden="true">
            {fiche?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fiche.avatar_url} alt="" />
            ) : (
              <span>{nom.trim().charAt(0).toUpperCase()}</span>
            )}
          </div>
          <p className={styles.afficheNom}>{nom}</p>
          <p className={styles.afficheLigne}>
            {profil?.category ? CATEGORIES[profil.category] : (
              <Link href="/profil/identite" className={styles.manque}>+ auteur, producteur ou talent</Link>
            )}
            {listeMetiers.length > 0 && ` · ${listeMetiers.slice(0, 3).join(", ")}`}
          </p>
          <p className={styles.afficheLigne}>
            {lieu || (
              <Link href="/profil/identite" className={styles.manque}>+ votre ville</Link>
            )}
          </p>
          {profil?.validation_status === "en_attente" && (
            <p className={styles.afficheAttente}>En attente de validation par un administrateur</p>
          )}

          <div className={styles.pastilles}>
            {listeGenres.slice(0, 4).map((g) => (
              <span key={g} className={styles.pastille}>{g}</span>
            ))}
            {listeGenres.length === 0 && (
              <Link href="/profil/parcours" className={`${styles.pastille} ${styles.manque}`}>
                + vos genres
              </Link>
            )}
          </div>

          {replique ? (
            <p className={styles.replique}>
              {replique.question} <em>{replique.reponse}</em>
            </p>
          ) : (
            <Link href="/profil/gouts" className={`${styles.replique} ${styles.manque}`}>
              « Si j&apos;étais un film… » à compléter
            </Link>
          )}

          <Link href={`/membres/${user.id}`} className={styles.afficheLien}>
            Voir ma fiche
          </Link>
        </section>

        {/* Les trois blocs, le prochain mis en avant. */}
        <section className={styles.generique} aria-label="Compléter mon profil">
          <div className={styles.generiqueEntete}>
            <h2 className={styles.generiqueTitre}>Profil complété</h2>
            <strong className={styles.generiqueCompte}>{pourcent} %</strong>
          </div>
          <div className={styles.jauge} aria-hidden="true">
            <span style={{ width: `${pourcent}%` }} />
          </div>

          {BLOCS.map((b) => {
            const estFait = fait[b.cle];
            const pourcentDuBloc = pourcentBloc[b.cle];
            // Un bloc pas complet à 100 % se signale : cadre aux couleurs
            // des engagements et pourcentage en haut à droite. Utile à qui
            // a été interrompu en plein remplissage et l'a oublié.
            const incomplet = pourcentDuBloc < 100;
            return (
              <Link
                key={b.cle}
                href={`/profil/${b.cle}`}
                className={incomplet ? styles.etapeIncomplete : styles.etape}
                title={incomplet ? "Cliquez pour compléter ce bloc" : "Cliquez pour modifier ce bloc"}
              >
                <span className={estFait ? styles.etapeFaite : styles.etapeNumero}>
                  {estFait ? "✓" : b.numero}
                </span>
                <span className={styles.etapeTexte}>
                  <strong>{b.titre}</strong>
                  <span>{incomplet ? b.duree : "Complet · modifier"}</span>
                </span>
                {incomplet && <span className={styles.etapePourcent}>{pourcentDuBloc} %</span>}
              </Link>
            );
          })}
        </section>
      </div>

      {/* Se déconnecter et quitter la plateforme sont rangés à part : on
          reste connecté avec le lien magique, un gros bouton faisait
          cliquer par réflexe. */}
      <p className={styles.reglages}>
        <Link href="/profil/compte">Réglages du compte</Link>
      </p>
    </PageShell>
  );
}
