import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
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
    <PageShell nav="profil" connecte>
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

      {/* Se déconnecter et quitter la plateforme sont rangés à part : on
          reste connecté avec le lien magique, un gros bouton faisait
          cliquer par réflexe. */}
      <p className={styles.reglages}>
        <Link href="/profil/compte">Réglages du compte</Link>
      </p>
    </PageShell>
  );
}
