import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import BoutonFeuArtifice from "@/components/BoutonFeuArtifice";
import formStyles from "@/components/form.module.css";
import { ERREURS, lireDemande } from "@/lib/changement-adresse";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmerAdresse } from "../actions";

/**
 * Arrivée depuis le lien reçu sur la nouvelle adresse. Comme pour la
 * connexion, le changement ne se fait qu'au clic : certaines messageries
 * visitent les liens reçus, ce qui consommerait un lien à usage unique.
 */
export default async function ConfirmerAdressePage({
  searchParams,
}: {
  searchParams: Promise<{ jeton?: string; erreur?: string }>;
}) {
  const { jeton, erreur } = await searchParams;
  const demande = jeton ? await lireDemande(jeton) : null;

  let prenom: string | null = null;
  if (demande) {
    const admin = createAdminClient();
    const { data } = admin
      ? await admin.from("profiles").select("first_name").eq("id", demande.profile_id).maybeSingle<{ first_name: string | null }>()
      : { data: null };
    prenom = data?.first_name ?? null;
  }

  return (
    <AuthCard active="connexion" theme="clair" sansOnglets compacte logoAnime>
      {demande && jeton ? (
        <form className={formStyles.form} action={confirmerAdresse}>
          <input type="hidden" name="jeton" value={jeton} />
          <p style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{prenom ? `Bonjour ${prenom} !` : "Bonjour !"}</p>
          <p style={{ marginTop: 10 }}>
            Un clic pour que <strong>{demande.nouvelle_adresse}</strong> devienne l&apos;adresse de
            votre compte.
          </p>
          <BoutonFeuArtifice className={`${formStyles.submitWide} ${formStyles.rouge}`}>
            Confirmer ma nouvelle adresse
          </BoutonFeuArtifice>
        </form>
      ) : (
        <>
          <p className={formStyles.error}>{erreur ?? ERREURS.lienPerime}</p>
          <p style={{ marginTop: 16 }}>
            <Link href="/profil/adresse">Refaire la demande</Link>
          </p>
        </>
      )}
    </AuthCard>
  );
}
