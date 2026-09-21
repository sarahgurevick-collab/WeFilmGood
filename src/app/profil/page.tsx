import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { quitterLaPlateforme } from "./actions";
import { BLOCS, calculerCompletion } from "./completion";
import styles from "./profil.module.css";

const CATEGORIES: Record<string, string> = {
  auteur: "Auteur",
  producteur: "Producteur",
  talent: "Autre Talent",
};

/**
 * Sommaire de l'étape 2. On y arrive juste après avoir activé son compte,
 * puis chaque fois qu'on ouvre « Mon profil » : quatre blocs à compléter
 * quand on veut, une jauge, et en bas la gestion du compte.
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

  const { pourcent, fait, profil } = await calculerCompletion(supabase, user.id);
  const prenom = profil?.first_name ?? profil?.full_name?.split(" ")[0] ?? null;

  // Le premier bloc pas encore fait est celui qu'on met en avant.
  const prochain = BLOCS.find((b) => !fait[b.cle]) ?? null;

  return (
    <PageShell theme="clair" nav="profil" connecte>
      {enregistre && <p className={styles.ok}>Modifications enregistrées.</p>}

      <div className={styles.entete}>
        <div>
          {bienvenue && <p className={styles.surtitre}>Étape 2 sur 2</p>}
          <h1 className={styles.titre}>
            {bienvenue
              ? `Bienvenue${prenom ? ` ${prenom}` : ""}, votre compte est activé.`
              : (profil?.full_name ?? "Mon profil")}
          </h1>
          <p className={styles.chapeau}>
            {pourcent === 100
              ? "Votre profil est complet. Vous pouvez le modifier quand vous voulez."
              : "Complétez votre profil quand vous voulez : chaque bloc prend deux minutes."}
          </p>
          {profil?.category && (
            <p className={formStyles.hint} style={{ marginTop: 10 }}>
              {CATEGORIES[profil.category]}
              {profil.validation_status === "en_attente" &&
                " — en attente de validation par un administrateur"}
            </p>
          )}
        </div>

        <div className={styles.jaugeCarte}>
          <div className={styles.jaugeLigne}>
            <span>Profil complété</span>
            <strong>{pourcent} %</strong>
          </div>
          <div className={styles.jauge}>
            <span style={{ width: `${pourcent}%` }} />
          </div>
          <p className={styles.jaugeTexte}>
            Un profil complet est mieux repéré par les producteurs dans le Finder.
          </p>
        </div>
      </div>

      <div className={styles.grille}>
        {BLOCS.map((b) => {
          const estFait = fait[b.cle];
          const estProchain = prochain?.cle === b.cle;
          return (
            <Link
              key={b.cle}
              href={`/profil/${b.cle}`}
              className={estProchain ? styles.carteActive : styles.carte}
            >
              <div className={styles.carteEntete}>
                <span className={styles.carteTitre}>
                  <span className={estFait ? styles.numeroFait : styles.numero}>
                    {estFait ? "✓" : b.numero}
                  </span>
                  {b.titre}
                </span>
                {estFait ? (
                  <span className={styles.badgeFait}>Fait</span>
                ) : estProchain ? (
                  <span className={styles.badge}>Commencer ici</span>
                ) : null}
              </div>
              <p className={styles.carteTexte}>{b.resume}</p>
              <p className={styles.carteMeta}>{b.duree}</p>
            </Link>
          );
        })}
      </div>

      <div className={styles.compte}>
        <form action="/deconnexion" method="post">
          <button type="submit" className={formStyles.submit}>
            Se déconnecter
          </button>
        </form>

        <h2 className={styles.section}>Quitter la plateforme</h2>
        <p className={formStyles.hint}>
          Ce bouton ne supprime pas votre compte. Il ferme votre accès et retire votre
          profil de l&apos;annuaire : plus personne ne peut vous contacter. Vos projets
          restent en ligne et gardent votre nom — c&apos;est ce qui permet à WeFilmGood de
          vous prévenir si un producteur s&apos;y intéresse. Pour revenir, il suffit de vous
          reconnecter.
        </p>
        <p className={formStyles.hint} style={{ marginTop: 12 }}>
          Pour un effacement définitif de vos données personnelles,{" "}
          <Link href="/cguv">écrivez-nous</Link> : nous ne pourrons alors plus vous
          joindre, même si un producteur cherche à vous parler.
        </p>

        <form action={quitterLaPlateforme} className={formStyles.form} style={{ marginTop: 20 }}>
          <label className={formStyles.field}>
            <span>Pourquoi partez-vous ? (facultatif)</span>
            <textarea name="reason" rows={3} />
          </label>
          <label className={formStyles.checkline}>
            <input type="checkbox" name="confirmation" value="1" required />
            <span>Je confirme vouloir fermer mon accès à WeFilmGood.</span>
          </label>
          <button type="submit" className={formStyles.submit}>
            Fermer mon accès
          </button>
        </form>
      </div>
    </PageShell>
  );
}
