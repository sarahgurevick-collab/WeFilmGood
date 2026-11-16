import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { quitterLaPlateforme, reglerMessagerie } from "../actions";
import styles from "../profil.module.css";

/**
 * Réglages du compte : ses factures, se déconnecter, quitter la plateforme.
 *
 * Volontairement à l'écart du profil. Avec le lien de connexion, on reste
 * connecté des mois sur son appareil : un bouton « Se déconnecter » bien
 * visible faisait cliquer par réflexe, et obligeait ensuite à redemander
 * un lien. Quitter la plateforme, plus grave encore, se trouve tout en bas.
 */
export default async function ComptePage({
  searchParams,
}: {
  searchParams: Promise<{ messagerie?: string }>;
}) {
  const { messagerie } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/profil/compte");

  // Le réglage de la messagerie ne concerne que les producteurs et les comédiens.
  const { data: surveille } = await supabase.rpc("messagerie_surveillee", { uid: user.id });
  const { data: moi } = surveille
    ? await supabase.from("profiles").select("messages_ouverts").eq("id", user.id).maybeSingle<{ messages_ouverts: boolean }>()
    : { data: null };
  const ouverte = moi?.messages_ouverts !== false;

  // Les factures d'adhésion, émises automatiquement à chaque paiement :
  // ici depuis le 15/11 (Sarah), et non plus sur la page Adhésion.
  const { data: factures } = await supabase
    .from("membership_invoices")
    .select("id, numero, issued_at")
    .order("issued_at", { ascending: false })
    .returns<{ id: string; numero: string; issued_at: string }[]>();

  return (
    <PageShell nav="profil" connecte>
      <h1 className={styles.titre}>Réglages du compte</h1>

      {surveille === true && (
        <>
          <h2 className={styles.section}>Ma messagerie</h2>
          <p className={formStyles.hint}>
            Si vous recevez beaucoup de messages, vous pouvez fermer votre messagerie
            momentanément. Vous pouvez toujours écrire, et les personnes à qui vous avez
            écrit peuvent vous répondre.
          </p>
          <p style={{ marginTop: 12 }}>
            Votre messagerie est {ouverte ? "ouverte" : "fermée"}.
            {messagerie && <span className={styles.ok}> Enregistré.</span>}
          </p>
          <form action={reglerMessagerie} style={{ marginTop: 12, marginBottom: 40 }}>
            <input type="hidden" name="ouvrir" value={ouverte ? "0" : "1"} />
            <button type="submit" className={formStyles.submit}>
              {ouverte ? "Fermer ma messagerie momentanément" : "Rouvrir ma messagerie"}
            </button>
          </form>
        </>
      )}

      {(factures ?? []).length > 0 && (
        <>
          <h2 className={styles.section}>Mes factures</h2>
          <p style={{ marginTop: 8, marginBottom: 40 }}>
            {(factures ?? []).map((f, i) => (
              <span key={f.id}>
                {i > 0 && " · "}
                <Link href={`/adhesion/facture/${f.id}`}>
                  {f.numero} ({new Date(f.issued_at).toLocaleDateString("fr-FR")})
                </Link>
              </span>
            ))}
          </p>
        </>
      )}

      <h2 className={styles.section}>Se déconnecter</h2>
      <p className={formStyles.hint}>
        Inutile sur votre propre ordinateur ou téléphone : vous y restez connecté·e, sans
        redemander de lien. Déconnectez-vous seulement d&apos;un appareil prêté ou partagé.
        Il vous faudra ensuite un nouveau lien pour revenir.
      </p>
      <form action="/deconnexion" method="post" style={{ marginTop: 12 }}>
        <button type="submit" className={formStyles.submit}>
          Me déconnecter de cet appareil
        </button>
      </form>

      <div className={styles.compte}>
        <h2 className={styles.section} style={{ marginTop: 0 }}>
          Quitter la plateforme
        </h2>
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
          {/* Plus de gros bouton (16/11, Sarah : « il peut se confondre avec
              l'autre ») : la phrase en gris, discrète, est le lien. */}
          <input type="hidden" name="confirmation" value="1" />
          <button
            type="submit"
            className={formStyles.hint}
            style={{
              alignSelf: "flex-start",
              padding: 0,
              border: 0,
              background: "none",
              font: "inherit",
              cursor: "pointer",
              textAlign: "left",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Je confirme vouloir fermer mon accès à WeFilmGood.
          </button>
        </form>
      </div>
    </PageShell>
  );
}
