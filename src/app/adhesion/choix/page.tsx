import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { modeHelloAsso, testeurPaiement } from "@/lib/helloasso";
import { createClient } from "@/lib/supabase/server";
import { adherer } from "../actions";

/**
 * « J'adhère » (15/11, Sarah) : on choisit comment payer, puis on part sur
 * la page de paiement HelloAsso. À l'année en une fois (75 €), ou au mois
 * par prélèvement (7 €, 12 fois : un engagement d'un an).
 *
 * Tant que HelloAsso est en mode test, seuls l'administration et les
 * testeurs arrivent ici ; les autres retrouvent « Le paiement en ligne
 * ouvre très bientôt ».
 */
export default async function ChoixAdhesionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent("/adhesion/choix")}`);

  if (modeHelloAsso() === "sandbox") {
    const { data: estAdmin } = await supabase.rpc("is_admin");
    if (!estAdmin && !testeurPaiement(user.id)) redirect("/adhesion?paiement=bientot");
  }

  return (
    <PageShell eyebrow="Adhésion" title="J’adhère" connecte>
      <form action={adherer} className={formStyles.form} style={{ marginTop: 16 }}>
        <input type="hidden" name="plan" value="mois_7" />
        <button type="submit" className={formStyles.submitWide}>
          7 € par mois
        </button>
        <p className={formStyles.hint}>Prélevés chaque mois pendant un an (12 × 7 €).</p>
      </form>
      <form action={adherer} className={formStyles.form} style={{ marginTop: 24 }}>
        <input type="hidden" name="plan" value="annee_75" />
        <button type="submit" className={formStyles.submitWide}>
          75 € à l’année (-10%)
        </button>
        <p className={formStyles.hint}>Payés en une fois.</p>
      </form>
      <p className={formStyles.hint} style={{ marginTop: 24 }}>
        Le paiement passe par HelloAsso.
        {modeHelloAsso() === "sandbox" && " Mode test : fausse carte, visible de l’administration et des testeurs seulement."}
      </p>
    </PageShell>
  );
}
